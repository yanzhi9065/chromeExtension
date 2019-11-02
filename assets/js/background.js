console.log("background js loaded")

let userkey = "";

const PROCESSED = "processed";
const FAILED = "processing_failed";

chrome.contextMenus.create({ 
  id: 'OutfitImageGrabber',
  title: 'Grab this outfit!',
  contexts: ['image'],
});

chrome.contextMenus.onClicked.addListener((info) => {
  if(info.menuItemId === "OutfitImageGrabber") {
    let imgsrc = info.srcUrl
    console.log("image src:", info.srcUrl)
    chrome.storage.local.get(['userInfo'], (res) => {
      let userInfo = res.userInfo
      console.log("userInfo:", userInfo)
      console.log("userkey:", userkey)
      uploadWebItem(userInfo.uuid, userkey, imgsrc).then(res => {
        console.log("item uploaded")
        alert("item uploaded");
      }).catch(err => {
        console.log("failed to upload item:", err)
        alert(err.msg)
      });
    })
  }
})

chrome.runtime.onMessage.addListener(function(message, sender, cb){
  console.log(message);
  switch(message.msg){
    case "loadUserInfo":
      loadUserInfo(cb);
      break;
    case "score":
      let data = {};
      data.score=100
      cb({data, index: message.index})
      break;
    case "login":
      handleLogin(message.loginInfo, cb)
      break;
  }
  //execute function on receiving a new message
  return true; // will respond asynchronously
});

function loadUserInfo(cb) {
  chrome.cookies.get({url:"https://app.tryforma.com", name:"token"}, (cookie) => {
    if(cookie) {
      console.log("found cookie:", cookie)
      let params = cookie.value.split('&&');
      let token = params[0], uuid = params[1];
      userkey = token;
      console.log("found cookie, uuid=" + uuid + ", token=" + token + ", loading userInfo")

      chrome.storage.local.get(['userInfo'], result => {
        console.log("result from background:", result)
        if(result.userInfo.username) {
          console.log("found cache in storage, use this");
          cb(result.userInfo)
        }
        else {
          console.log("no cache, getting user info");
          fetch("https://social.isabq.com/api/v1/users/"+uuid+"/",{
            method: "POST",
            headers: {
              "user-agent": "Mozilla/4.0 berners",
              "content-type": "application/json",
              accept: "application/json",
              Authorization: "Token " + userkey
            },
          })
          .then(res => res.json())
          .then(body => {
            console.log("res:", body)
            if(body.username) {
              console.log("get username:", body.username)
              chrome.storage.local.set({userInfo:body})
              cb(body)
            } else {
              console.log("failed to load user info by uuid");
              cb(null);
            }
          }).catch(err => {
            console.log("failed to get userInfo:", err)
            cb(null);
          });
        }
      })
    } else {
      console.log("no session, no cookie, login again");
      cb(null)
    }
  })
}

function handleLogin({username, password}, cb) {
  const url = "https://social.isabq.com/api/v1/auth/login/";
  let body = { password: password };
  let key = /^\w+([-]?\w+)*@\w+([-]?\w+)*(\.\w{2,3})+$/.test(username)
    ? "email"
    : "username";
  body[key] = username;

  fetch(url, {
    method:"POST",
    body:JSON.stringify(body),
    headers: {
      "content-type": "application/json"
    },
  }).then(res => res.json())
  .then(res => {
    if(res.error) {
      console.log("login failed:", res.error);
      cb({isLogin:false, msg:res.error.message});
      return 
    }

    userkey = res.key;
    console.log("login success:", res);
    cb({isLogin:true, data:res});
  }).catch(err => {
    console.log("login failed:", err);
    cb({isLogin:false, msg:"connection failed"});
  })
}

function handleMenuClick(event) {
  console.log(event)
}

function getSignedUrl(username, key, type, itemUUID) {
  console.log("get singurl for:", type);
  let body = undefined;
  let method = "GET";
  if(type === "item") {
    body = JSON.stringify({ image_keys: ["source"] });
    method = "POST"
  } else if(type === "cover") {
    console.log("from signedURL, this is cover")
    body = JSON.stringify({ image_keys: ["cover"], "item_uuid":itemUUID });
    method = "POST"
    type = "item"
  }
  console.log("show body:", body);


  const URL =
    `${getBaseApiUrl()}/api/v1/aws/${type}_signed_url/?source=${username}`;
  return fetch(URL, {
    method,
    headers: {
      "user-agent": "Mozilla/4.0 berners",
      "content-type": "application/json",
      accept: "application/json",
      Authorization: "Token " + key
    },
    body,
  });
}

function uploadRemoteToS3(imageURL, uuid, username, key) {
  let url = 
  `${getBaseApiUrl()}/api/v1/items/${uuid}/fetch_from_url/?source=${username}`;
  let body = JSON.stringify({fileURL:imageURL});

  return fetch(url, {
    method: "POST",
    headers: {
      "user-agent": "Mozilla/4.0 berners",
      "content-type": "application/json",
      accept: "application/json",
      Authorization: "Token " + key
    },
    body: body,
  });
}

function fetchItemStatus(uuid, key, type) {
  let URL = "";
  if(type === "tryons")
    URL = `${getBaseApiUrl()}/api/v1/${type}/${uuid}/async_status/`;
  else
    URL = `${getBaseApiUrl()}/api/v1/${type}/${uuid}/status/`;

  return new Promise((resolve, reject) => {
    fetch(URL, {
        method: "GET",
        headers: {
          "user-agent": "Mozilla/4.0 donatella",
          accept: "application/json",
          Authorization: "Token " + key
        }
      }).then(res => res.json())
      .then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      })});
}

async function checkItemStatus(itemUUID, key) {
  try{
    let res = await fetchItemStatus(itemUUID, key, 'items');
    return res;
  } catch(err) {
    return null;
  }
}

async function checkItemStatus(itemUUID, key) {
  try{
    let res = await fetchItemStatus(itemUUID, key, 'items');
    return res;
  } catch(err) {
    return null;
  }
}

function uploadWebItem(userId, key, imageURL) {
  let errMsg = undefined;
  return new Promise(async (resolve, reject) =>  {
    try {
      let res = await getSignedUrl(userId, key, 'item');
      if(!res.json || !res.ok) {
        throw new Error("fetchURL");
      }

      console.log("get json from signedURL")
      let body = await res.json();
      if(body.error) {
        throw new Error("fetchURL");
      } else {
        let itemUUID = body.uuid;
        console.log("request uploading")
        res = await uploadRemoteToS3(imageURL, itemUUID, userId, key);
        if(!res.ok) {
          //store.dispatch(uploadFail());
          throw new Error("uploadImage");
        }

        body = await res.json();
        let payload = {uuid:itemUUID, image_url:body.result, type:"item"};
        //store.dispatch(uploadSuccess(payload));
        
        const PollPeriod = 2; //second
        const Timeout = 120; //second
        let cnt = 0;
        let currentState = undefined;

        //store.dispatch(startItemProcess());
        while(cnt < Timeout) {
          await delaySecond(PollPeriod)
          body = await checkItemStatus(itemUUID, key);
          currentState = body.status;
          console.log("currentState:", currentState);
          if(currentState === PROCESSED) {
            //store.dispatch(finishItemProcess());
            resolve({itemUUID, url:res.url+itemUUID});
            break;
          } else if(currentState === FAILED){
            errMsg = body.message || body.status_message;
            throw new Error("processImage")
          }
        }

        if(currentState !== PROCESSED) {
            //failed to get new status
            throw new Error("processImage")
        }
      }
    } catch(err) {
      console.log(err);
      reject({type:err.message, msg:errMsg});
    }
  });
}

function tryon(avatarUUID, itemUUID, username, key) {
  const URL = `${getBaseApiUrl()}/api/v1/tryons/async/?source=` + username;
  const data = {
    avatars: [{uuid: avatarUUID}],
    items: [{uuid: itemUUID}]
  };

  //store.dispatch(handleShowTryon({avatarUUID, itemUUID, username}))
  return new Promise(async (resolve, reject) => {
    try{
      let res = await fetch(URL, {
        method: "POST",
        headers: {
          "user-agent": "Mozilla/4.0 donatella",
          "content-type": "application/json",
          accept: "application/json",
          Authorization: "Token " + key
        },
        body: JSON.stringify(data)
      }).then(res => res.json());

      let tryonUUID = res.uuid;
      // let payload = {uuid:tryonUUID, image_url:res.url, type:"avatar"};
      // store.dispatch(uploadSuccess(payload));

      const PollPeriod = 2; //second
      const Timeout = 120; //second
      let cnt = 0;
      let currentState = undefined;

      // store.dispatch(startAvatarProcess());
      while(cnt < Timeout) {
        await delaySecond(PollPeriod)
        res = await checkTryonStatus(tryonUUID, key);
        currentState = res.status;
        console.log("currentState:", currentState);
        if(currentState === PROCESSED) {
          // store.dispatch(finishAvatarProcess());
          //store.dispatch(handleShowTryonSuccess({avatarUUID, itemUUID, username, tryonUUID}))
          resolve({tryonUUID, url:res.media.main});
          break;
        } else if(currentState === FAILED){
          let reason = "processFailure"
          //store.dispatch(handleShowTryonFailure({avatarUUID, itemUUID, username, tryonUUID, reason}));
          throw new Error("processImage");
        }
      }

      if(currentState !== PROCESSED) {
          //failed to get new status
          let reason = "timeout"
          //store.dispatch(handleShowTryonFailure({avatarUUID, itemUUID, username, tryonUUID, reason}));
          throw new Error("processImage");
      }
    } catch(e) {
      reject(e);
    }
  })
}

function getBaseApiUrl() {
  return "https://social.isabq.com"
}

function delaySecond(t) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, t * 1000);
  });
}
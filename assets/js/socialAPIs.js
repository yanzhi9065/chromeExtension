import {getBaseApiUrl} from "utils/constants"
import store from "store/store.js"
import axios from 'axios';
import get from "lodash/get";
import loadImage from "blueimp-load-image";

import {
  uploadFail, 
  uploadSuccess, 
  startItemProcess, 
  finishItemProcess, 
  startAvatarProcess, 
  finishAvatarProcess, 
  loadItemInfo,
  } from "store/reducers/item_reducer";

import {
  updateUserProfile,
  handleShowTryon,
  handleShowTryonSuccess,
  handleShowTryonFailure,
  } from "store/dispatchers";

const PROCESSED = "processed";
const FAILED = "processing_failed";

///////////////////////////////
//
//         Utils functions
//
///////////////////////////////

function delaySecond(t) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, t * 1000);
  });
}

function resizeFile(filePayload) {
  return new Promise((resolve, reject) => {
    loadImage(
      filePayload,
      imgCanvas => {
        if (imgCanvas.type === "error") {
          reject({errorType:"resizeImage"});
        }

        imgCanvas.toBlob(
          blob => { resolve(blob)},
          "image/jpeg",
          0.9
        );
      },
      { maxHeight: 1500, orientation: true, canvas: true } // Options
    );
  });
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

function uploadToS3(signedUrlObject, object) {
  const { fields: signedUrlFields } = signedUrlObject;
  let body = new FormData();
  for (const key in signedUrlFields) {
    if (signedUrlFields.hasOwnProperty(key)) {
      body.append(key, signedUrlFields[key]);
    }
  }
  body.append("file", object);
  return fetch(signedUrlObject.url, {
    method: "POST",
    body: body
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

async function checkAvatarStatus(avatarUUID, key) {
  try{
    let res = await fetchItemStatus(avatarUUID, key, 'avatars');
    return res;
  } catch(err) {
    return null;
  }
}

async function checkTryonStatus(tryonUUID, key) {
  try{
    let res = await fetchItemStatus(tryonUUID, key, 'tryons');
    return res;
  } catch(err) {
    return null;
  }
}

////////////////////////////
//
//        Social APIs
//
////////////////////////////
//email signup
export function userSignup(username, password, email) {
    const path = "/api/v1/auth/signup/";
    let body = {
      username,
      email,
      password1:password,
      password2:password,
      generated_password: false,
    };

    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
        "Content-Type":"application/json",
      },
    });

  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.post(path, body);
      if(res.status === 201) {
        resolve();
      } else {
        reject(res.body);
      }
    } catch(err) {
      if(err.response)
        reject(err.response.data);
      else
        reject("Unknown Err");
    }
  });
}

export function userLogin(username, password) {
  const path = "/api/v1/auth/login/";

  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 15*1000,
    headers: {
      "content-type": "application/json"
    },
  });

  let body = { password: password };
  let key = /^\w+([-]?\w+)*@\w+([-]?\w+)*(\.\w{2,3})+$/.test(username)
    ? "email"
    : "username";
  body[key] = username;

  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.post(path, body);
      if(res.status === 200) {
        resolve(res.data);
      } else {
        reject(res.body);
      }
    } catch(err) {
      if(err.response)
        reject(err.response.data);
      else
        reject("Unknown Err");
    }
  });
}

//user login through fb, with tag if possible
export function userFBLogin(accessCode, userTag=undefined) {
  const path = "/api/v1/auth/facebook/";
  let body = {
    access_token: accessCode,
    user_tag: userTag
  }

  const instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
      "content-type": "application/json"
    },
  });

  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.post(path, body)
      if(res.status === 200 && res.data.key)
        resolve(res.data)
      else
        reject("wrong status code:", res.status)
    } catch(err) {
      reject("err to login:", err);
    }
  });
}

export function tagUser(useruuid, key, tag) {
    const path = `/api/v1/users/${useruuid}/tags/`;
    let body = {
      useruuid,
      tags:[tag],
    };

    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
        "Content-Type":"application/json",
        Authorization: "Token " + key,
      },
    });

  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.post(path, body);
      if(res.status === 200) {
        resolve();
      } else {
        let msg = res.body?res.body.status_message:"";
        reject(msg);
      }
    } catch(err) {
      if(err.response)
        reject(err.response.data);
      else
        reject("Unknown Err");
    }
  });
}

export function uploadWebItem(userId, key, imageURL) {
  let errMsg = undefined;
  return new Promise(async (resolve, reject) =>  {
    try {
      let res = await getSignedUrl(userId, key, 'item');
      if(!res.json || !res.ok) {
        throw new Error("fetchURL");
      }

      let body = await res.json();
      if(body.error) {
        throw new Error("fetchURL");
      } else {
        let itemUUID = body.uuid;
        res = await uploadRemoteToS3(imageURL, itemUUID, userId, key);
        if(!res.ok) {
          store.dispatch(uploadFail());
          throw new Error("uploadImage");
        }

        body = await res.json();
        let payload = {uuid:itemUUID, image_url:body.result, type:"item"};
        store.dispatch(uploadSuccess(payload));
        
        const PollPeriod = 2; //second
        const Timeout = 120; //second
        let cnt = 0;
        let currentState = undefined;

        store.dispatch(startItemProcess());
        while(cnt < Timeout) {
          await delaySecond(PollPeriod)
          body = await checkItemStatus(itemUUID, key);
          currentState = body.status;
          console.log("currentState:", currentState);
          if(currentState === PROCESSED) {
            store.dispatch(finishItemProcess());
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

export function uploadItem(userId, key, file) {
    let itemUUID = "";
    return new Promise((resolve, reject) =>  {
        getSignedUrl(userId, key, 'item').then(res => {
            if(!res.json) {
                reject("Server No Reponse");
            } else if(!res.ok) {
                reject(res.statusText);
            }
            return res.json();
        }).then(body => {
            if(body.error) {
                reject(body.error.message);
            } else {
              itemUUID = body.uuid;
              return uploadToS3(body.signed_urls.source,file);
            }
        }).then(async res => {
            if(!res.url) {
              reject("upload failed");
              store.dispatch(uploadFail());
            }
            let payload = {uuid:itemUUID, image_url:res.url, type:"item"};
            store.dispatch(uploadSuccess(payload));

            const PollPeriod = 2; //second
            const Timeout = 120; //second
            let cnt = 0;
            let currentState = undefined;

            store.dispatch(startItemProcess());
            while(cnt < Timeout) {
              await delaySecond(PollPeriod)
              let body = await checkItemStatus(itemUUID, key);
              currentState = body.status;
              console.log("currentState:", currentState);
              if(currentState === PROCESSED) {
                store.dispatch(finishItemProcess());
                resolve({itemUUID, url:res.url+itemUUID});
                break;
              } else if(currentState === FAILED){
                reject("process failed:" + body.status_message);
                break;
              }
            }

            if(currentState !== PROCESSED) {
                //failed to get new status
                reject("Failed to process");
            }
        }).catch(err => {
            console.log("unexpected err:", err);
            reject(err)
        });
    });
}

export function uploadCover(userId, key, itemUUID, file) {
  console.log("ready to upload cover:", userId, key, itemUUID, file)
    return new Promise((resolve, reject) =>  {
        getSignedUrl(userId, key, 'cover', itemUUID).then(res => {
            if(!res.json) {
                reject("Server No Reponse");
            } else if(!res.ok) {
                reject(res.statusText);
            }
            return res.json();
        }).then(body => {
            if(body.error) {
                reject(body.error.message);
            } else {
              itemUUID = body.uuid;
              return uploadToS3(body.signed_urls.cover,file);
            }
        }).then(async res => {
            if(!res.url) {
              reject("upload failed");
              store.dispatch(uploadFail());
            }
            let payload = {uuid:itemUUID, image_url:res.url, type:"item"};
            store.dispatch(uploadSuccess(payload));
            resolve();
        }).catch(err => {
            console.log("unexpected err:", err);
            reject(err)
        });
    });
}

export function delItem(key, itemUUID) {
  let url = "/api/v1/items/" + itemUUID + "/";
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
      "user-agent": "Mozilla/4.0 berners",
      accept: "application/json",
      "Content-Type":"application/json",
      Authorization: "Token " + key,
    },
  });

  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.delete(url);
      if(res.status < 210) {
        console.log("deleted", res);
        resolve();
      } else {
        let msg = res.body?res.body.status_message:"";
        reject(msg);
      }
    } catch {
      reject("Unknown Error!");
    }
  });
}

export function uploadMetadata(itemUUID, key, title, hashtags) {
  let uploadPacket = {itemUUID, title, hashtags};
  console.log("new packet", uploadPacket);

  let url = "/api/v1/items/" + itemUUID + "/";
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
      "user-agent": "Mozilla/4.0 berners",
      accept: "application/json",
      "Content-Type":"application/json",
      Authorization: "Token " + key,
    },
  });
  
  return new Promise(async (resolve, reject) => {
    try{
      let res = await instance.patch(url, uploadPacket);
      if(res.status === 200) {
        console.log("uploaded", res);
        resolve();
      } else {
        let msg = res.body?res.body.status_message:"";
        reject(msg);
      }
    } catch {
      reject("Unknown Error!");
    }
  });
}

export function uploadAvatar(userId, key, file) {
  return new Promise(async (resolve, reject) => {
    try{
      let uploadImage = await resizeFile(file);
      let res = await getSignedUrl(userId, key, 'avatar')
      if(!res.json) {
        throw new Error("fetchURL")
      }

      if(!res.ok) {
        throw new Error("fetchURL")
      }

      let body = await res.json();
      if(body.error) {
        throw new Error("fetchURL")
      } else {
        let avatarUUID = body.uuid;
        res = await uploadToS3(body, uploadImage);
        if(!res.url) {
          throw new Error("uploadImage");
        }

        let payload = {uuid:avatarUUID, image_url:res.url, type:"avatar"};
        store.dispatch(uploadSuccess(payload));

        const PollPeriod = 2; //second
        const Timeout = 120; //second
        let cnt = 0;
        let currentState = undefined;

        store.dispatch(startAvatarProcess());
        while(cnt < Timeout) {
          await delaySecond(PollPeriod)
          res = await checkAvatarStatus(avatarUUID, key);
          currentState = res.status;
          console.log("currentState:", currentState);
          if(currentState === PROCESSED) {
            store.dispatch(finishAvatarProcess());
            resolve({avatarUUID, url:res.url+avatarUUID});
            break;
          } else if(currentState === FAILED){
            throw new Error("processImage");
          }
        }

        if(currentState !== PROCESSED) {
            //failed to get new status
            throw new Error("processImage");
        }
      }
    } catch(err) {
      console.log("into err handler2, ", err);
      switch (err.message) {
        case "resizeImage":
          reject("Failed to do image preprocessing!");
          break;
        case "fetchURL":
          reject("Failed to uploading image(request bucket)");
          break;
        case "uploadImage":
          reject("Failed to uploading image");
          break;
        case "processImage":
          reject("Failed to process image");
          break;
        default:
          console.log(err);
          reject("Unknown error");
      }
    }
  });
}

export async function* getUserOutfits(username, key) {
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 60*1000,
    headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: "Token " + key
    },
  })

  let path=`/api/v1/items/?page=1&page_size=10`;
  while(path) {
    let res = await instance.get(path);
    path = undefined;
    if(res) {
      yield res.data;
      let newURL = res.data.next;
      console.log("newURL=",newURL);
      if(newURL && newURL.startsWith("http:")) {
        console.log("replace it...")
        newURL = newURL.replace("http:", "https:");
      }
      console.log("newURL=", newURL)
      //path = res.data.next;
      path = newURL;
    }
  }
  return
}

export async function getUserStats(userUUID, key) {
  let path = `/api/v1/users/${userUUID}/tryon_count/`;
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: "Token " + key
    },
  })

  let res = await instance.get(path);
  if(res.status === 200)
    return res.data.tryon_count;
  else
    return 0;
}

export function saveUserProfile(userInfo) {
    console.log("saving user params:", userInfo)
    const URL = `${getBaseApiUrl()}/api/v1/users/${userInfo.uuid}/`;
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: "Token " + userInfo.key
      },
    });

    return new Promise( async (resolve, reject) => {
      try{
        let res = await instance.patch(URL, userInfo);
        if(res.status === 200) {
          //update redux
          let newUserInfo = res.data;
          newUserInfo.firstname = res.data.first_name;
          newUserInfo.lastname = res.data.last_name;
          store.dispatch(updateUserProfile(newUserInfo));
          resolve()
        } else {
          console.log("weird success code:", res.status)
          resolve();
        }
      } catch(err) {
        let msg = get(err, "response.data.error.message", undefined);
        if(msg) {
          reject("Error: " + msg)
        } else {
          if(err.response)
            reject("Unknon err, Code:", err.response.code);
          else
            reject("Unknon err");
        }
      }
    })
}

export function tryon(avatarUUID, itemUUID, username, key) {
  const URL = `${getBaseApiUrl()}/api/v1/tryons/async/?source=` + username;
  const data = {
    avatars: [{uuid: avatarUUID}],
    items: [{uuid: itemUUID}]
  };

  store.dispatch(handleShowTryon({avatarUUID, itemUUID, username}))
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
          store.dispatch(handleShowTryonSuccess({avatarUUID, itemUUID, username, tryonUUID}))
          resolve({tryonUUID, url:res.media.main});
          break;
        } else if(currentState === FAILED){
          let reason = "processFailure"
          store.dispatch(handleShowTryonFailure({avatarUUID, itemUUID, username, tryonUUID, reason}));
          throw new Error("processImage");
        }
      }

      if(currentState !== PROCESSED) {
          //failed to get new status
          let reason = "timeout"
          store.dispatch(handleShowTryonFailure({avatarUUID, itemUUID, username, tryonUUID, reason}));
          throw new Error("processImage");
      }
    } catch(e) {
      reject(e);
    }
  })
}

export function getItemInfo(itemUUID, key) {
    const path = `/api/v1/items/${itemUUID}/`;
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: "Token " + key
      },
      credentials: "same-origin"
    });

    return new Promise( async (resolve, reject) => {
      try{
        let res = await instance.get(path);
        if(res.status === 200) {
          //update redux
          let itemInfo = res.data;
          itemInfo.media = itemInfo.media.main;
          store.dispatch(loadItemInfo(itemInfo));
          resolve()
        } else {
          console.log("weird success code:", res.status)
          reject("Unknown Error")
        }
      } catch(err) {
        if(err.response && err.response.status === 404)
          reject("Item does not exists");
        else
          reject("Unknown Error")
      }
    })
}

export function getTryonInfo(tryonUUID, key) {
    const path = `/api/v1/tryons/${tryonUUID}/`;
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: "Token " + key
      },
      credentials: "same-origin"
    });

    return new Promise( async (resolve, reject) => {
      try{
        let res = await instance.get(path);
        if(res.status === 200) {
          let tryonInfo = {
            uuid:res.data.items[0].uuid,
            media: res.data.media.main,
            author: res.data.author,
            is_public: res.data.is_public,
          }
          store.dispatch(loadItemInfo(tryonInfo));
          resolve()
        } else {
          console.log("weird success code:", res.status)
          reject("Unknown Error")
        }
      } catch(err) {
        if(err.response && err.response.status === 404)
          reject("Item does not exists");
        else
          reject("Unknown Error")
      }
    })
}

//could be item or tyron
export function postItem(type, uuid, toPublic, key) {
  console.log("post from socialAPI,", type, uuid, toPublic, key)
  const URL = `${getBaseApiUrl()}/api/v1/${type}/${uuid}/`;

  let body = {}
  if(type === 'items')
    body = JSON.stringify({ status: "live", "is_public":toPublic })
  else
    body = JSON.stringify({ status: "published", "is_public":toPublic })

  fetch(URL, {
    method: "PATCH",
    headers: {
      "user-agent": "Mozilla/4.0 berners",
      "content-type": "application/json",
      accept: "application/json",
      Authorization: "Token " + key
    },
    body,
  })
    .then(res => res.json())
    .then(json => {
      console.log(json);
      //this.setState({isUploading:false});
      //this.props.handleUpdateSuccess();
    }).catch(err => {
      console.log("failed to post:", err);
      //this.props.handleUpdateFailure("Failed to post item!", err.msg);
    });
}

//could be item or tyron
export function likeItem(uuid, type, key, toLike) {
  console.log("like/unlike from social:", toLike, type, uuid)
  const path = `/api/v1/${type}/${uuid}/likes/`
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: "Token " + key
    },
    credentials: "same-origin"
  });

  return new Promise( async (resolve, reject) => {
    try{
      let res;
      if(toLike)
        res = await instance.post(path)
      else
        res = await instance.delete(path)

      if(res.status === 204 || res.status === 201) {
        resolve()
      } else {
        console.log("weird success code:", res.status)
        reject("Unknown Error")
      }
    } catch(err) {
      console.log("err from apis:", err);
      if(err.response && err.response.status === 404)
        reject("Item does not exists");
      else
        reject("Unknown Error")
    }
  });
}

export function deleteAvatar(avatarUUID, key) {
    const path = `/api/v1/avatars/${avatarUUID}/`
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
          Authorization: "Token " + key
      },
      credentials: "same-origin"
    });

    return new Promise( async (resolve, reject) => {
      try{
        let res = await instance.delete(path);
        if(res.status === 204) {
          resolve()
        } else {
          console.log("weird success code:", res.status)
          reject("Unknown Error")
        }
      } catch(err) {
        console.log("err from apis:", err);
        if(err.response && err.response.status === 404)
          reject("Item does not exists");
        else
          reject("Unknown Error")
      }
    })
  }
  
export function loadTryon(pageSize, numPages, key) {
  const path = `/api/v1/tryons/`
  let instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: "Token " + key
    },
    credentials: "same-origin"
  });

  return new Promise( async (resolve, reject) => {
    try{
      let res = await instance.delete(path);
      if(res.status === 200) {
        resolve(res.data)
      } else {
        console.log("weird success code:", res.status)
        reject("Unknown Error")
      }
    } catch(err) {
      console.log("err from apis:", err);
      if(err.response && err.response.status === 404)
        reject("Item does not exists");
      else
        reject("Unknown Error")
    }
  })
}

export function handleSendEmail(email) {
  // Fetch to django
  const path = `/api/v1/auth/password/reset/`
  return new Promise( async (resolve, reject) => {
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
      },
      credentials: "same-origin"
    });

    instance.post(path, {email})
    .then(res => {
      if(res.status === 200) {
        if(res.data.error) {
          reject(res.data.email)
        } else {
          resolve();
        }
      } else {
        if(res.data.error) {
          reject(res.data.email)
        } else {
          reject("An unknown error occurred, please try again later.")
        }
      }
    }).catch(err => {
      reject("An unknown error occurred, please try again later.")
    })
  })
}

export function handleResetPassword(uid, token, new_password1, new_password2) {
  console.log("inpuit:",uid, token, new_password1, new_password2)
  const path = `/api/v1/auth/password/reset/confirm/`;
  let body ={ uid, token, new_password1, new_password2}
  return new Promise( async (resolve, reject) => {
    let instance = axios.create({
      baseURL:getBaseApiUrl(),
      timeout: 30*1000,
      headers: {
          "content-type": "application/json",
          accept: "application/json",
      },
      credentials: "same-origin"
    });

    instance.post(path, body)
    .then(res => {
      console.log("resolve:", res)
      resolve();
    }).catch(err => {
      console.log("catch:", err)
      if(err.response) {
        let body = err.response.data;
        let msg = body.error.message;
        console.log("error msg:", msg)
        if(msg) {
          if ( msg === "Token: Invalid value" ||msg === "uid Invalid value") {
            reject("This link has expired or is invalid, please try again.")
          } else  if(msg.startsWith("New_password")) {
            err = (body.new_password1 || body.new_password2)
            if(Array.isArray(err))
              err = err[0]
            reject(err)
          }
        } else {
          reject("An unknown error occurred, please try again later.")
        }
      } else {
        reject("An unknown error occurred, please try again later.")
      }
    })
  });
}

export function loadHashtagCards(hashtag, pageSize, numPages, key) {
  let path = `/api/v1/hashtags/${hashtag}/?page=1&page_size=${pageSize}&preview_count=${pageSize}`;
  const instance = axios.create({
    baseURL:getBaseApiUrl(),
    timeout: 30*1000,
    headers: {
        "content-type": "application/json",
        accept: "application/json",
        Authorization: "Token " + key
    },
    credentials: "same-origin"
  });

  return new Promise( async (resolve, reject) => {
    try{
      let res = await instance.get(path);
      if(res.status === 200) {
        resolve(res.data)
      } else {
        console.log("weird success code:", res.status)
        reject("Unknown Error")
      }
    } catch(err) {
      console.log("err from apis:", err);
      if(err.response && err.response.status === 404)
        reject("Item does not exists");
      else
        reject("Unknown Error")
    }
  })
}
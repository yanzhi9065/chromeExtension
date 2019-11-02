console.log("injecting js...")
console.log("try to loading userInfo")

let form = undefined
let helper = undefined

chrome.runtime.sendMessage({msg: 'loadUserInfo'}, function cb(res) {
  console.log("reviced userInfo:", res)
  let node = null;
  if(res && (res.useruuid||res.uuid)) {
    node = createHelper(res)
  }
  else
    node = createLogin()

  document.body.appendChild(node)
})

function createLogin() {
  form = document.createElement("form")
  let label1 = createLabel("uname", "Username")
  let input1 = createInput({type:"text", placeholder:"Enter Username", name:"uname"})
  form.appendChild(label1)
  form.appendChild(input1)
  let label2 = createLabel("psw", "Password")
  let input2 = createInput({type:"password", placeholder:"Enter Password", name:"psw"})
  form.appendChild(label2)
  form.appendChild(input2)
  let btn = document.createElement("button")
  btn.setAttribute("type", "submit")
  btn.setAttribute("style", "float:right;margin-top:10px")
  btn.innerText="Login"

  form.appendChild(btn)
  form.addEventListener("submit", login)
  return form
}

//document.getElementById("loginForm").addEventListener("submit", (event) => {
//  bp.console.log("login")
//})

function createLabel(attrFor, content) {
  let label = document.createElement("label")
  label.setAttribute("for", attrFor)
  label.innerHTML = "<b>"+content+"</b>"
  return label
}

function createInput(attr) {
  let input = document.createElement("input")
  input.setAttribute("type", attr.type)
  input.setAttribute("placeholder", attr.placeholder)
  input.setAttribute("name", attr.name)
  //input.setAttribute("required", true)
  return input
}

function createHelper(data) {
  helper = document.createElement("div")
  let label = document.createElement("label")
  let line1 = document.createElement("div"), line2 = document.createElement("div");
  label.innerText = "Welcome, " + data.username
  line1.appendChild(label)
  label = document.createElement("label")
  label.innerText = "Right click on the image of the outfit you want to tryon and wait for the magic to happen."
  line2.appendChild(label)

  helper.appendChild(line1)
  helper.appendChild(line2)
  return helper
}

function login(event) {
  console.log(event)
  let username = event.target["0"].value;
  let password = event.target["1"].value;
  event.preventDefault()

  chrome.runtime.sendMessage({msg: 'login', loginInfo:{username, password}}, function cb(res) {
    if(res.isLogin) {
      console.log("login Success:", res)
      document.body.removeChild(form)
      chrome.storage.local.set({userInfo:res.data})
      setCookie("token", res.data.key+"&&"+res.data.uuid)
      document.body.appendChild(createHelper(res.data))
    }
    else {
      alert(res.msg)
      console.log("login failed")
    }
  });
}

function setCookie(key, value) {
      chrome.cookies.set({
        url:"https://app.tryforma.com", 
        name: key, 
        value:value, 
        expirationDate:(new Date().getTime()/1000 + 3600*24*31)});
}
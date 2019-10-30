console.log("background js loaded")
chrome.runtime.onMessage.addListener(function(message, sender, cb){
  if(message.msg === "score") {
    let data = {}
    //scoring
    data.score=100
    cb({data, index: message.index})
  }
  //execute function on receiving a new message
  return true; // will respond asynchronously
});

console.log("script loaded")
//chrome.runtime.sendMessage(string extensionId, any message, object options, function responseCallback);
//

function checkImages(images) {
  for(let i=0; i<images.length; i++) {
    chrome.runtime.sendMessage({msg: 'score', index:i}, function cb({data, index}) {
      images[index].score = data.score;
    });
  }
}

// let images = document.getElementsByTagName('img');
// checkImages(images)

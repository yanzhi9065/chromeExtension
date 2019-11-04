console.log("script loaded")
//chrome.runtime.sendMessage(string extensionId, any message, object options, function responseCallback);
//

// function checkImages(images) {
//   for(let i=0; i<images.length; i++) {
//     chrome.runtime.sendMessage({msg: 'score', index:i}, function cb({data, index}) {
//       images[index].score = data.score;
//     });
//   }
// }

// let images = document.getElementsByTagName('img');
// checkImages(images)

wrapperDiv = document.createElement("div");
wrapperDiv.id="tryformaIframe"
wrapperDiv.setAttribute("style","display:none; position: absolute; left: 0px; top: 0px; background-color: rgb(0, 0, 0); opacity: 0.5; z-index: 2000; height: 1083px; width: 100%;");

iframeElement = document.createElement("iframe");
iframeElement.setAttribute("style","width: 100%; height: 100%;");

wrapperDiv.appendChild(iframeElement);

modalDialogParentDiv = document.createElement("div");
modalDialogParentDiv.setAttribute("style","display:none; position: absolute; width: 350px; border: 1px solid rgb(51, 102, 153); padding: 10px; background-color: rgb(255, 255, 255); z-index: 2001; overflow: auto; text-align: center; top: 149px; left: 497px;");

modalDialogSiblingDiv = document.createElement("div");

modalDialogTextDiv = document.createElement("div"); 
modalDialogTextDiv.setAttribute("style" , "text-align:center");

modalDialogTextSpan = document.createElement("span"); 
modalDialogText = document.createElement("strong"); 
modalDialogText.innerHTML = "Processing...  Please Wait.";

breakElement = document.createElement("br"); 
imageElement = document.createElement("img"); 
imageElement.src = chrome.extension.getURL("spinner_progress.gif");

modalDialogTextSpan.appendChild(modalDialogText);
modalDialogTextDiv.appendChild(modalDialogTextSpan);
modalDialogTextDiv.appendChild(breakElement);
modalDialogTextDiv.appendChild(breakElement);
modalDialogTextDiv.appendChild(imageElement);

modalDialogSiblingDiv.appendChild(modalDialogTextDiv);
modalDialogParentDiv.appendChild(modalDialogSiblingDiv);

document.body.appendChild(wrapperDiv);
document.body.appendChild(modalDialogParentDiv);
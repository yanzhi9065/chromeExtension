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
wrapperDiv.id="tryformaMask"
wrapperDiv.setAttribute("style","display:none; position: fixed; left: 0px; top: 0px; background-color: rgb(0, 0, 0); opacity: 0.5; z-index: 2000; height: 1083px; width: 100%;");
//wrapperDiv.setAttribute("style","position: fixed; left: 0px; top: 0px; background-color: rgb(0, 0, 0); opacity: 0.5; z-index: 2000; height: 1083px; width: 100%;");

iframeElement = document.createElement("iframe");
iframeElement.setAttribute("style","width: 100%; height: 100%;");

wrapperDiv.appendChild(iframeElement);

modalDialogParentDiv = document.createElement("div");
modalDialogParentDiv.id = "tryformaDialog"
modalDialogParentDiv.setAttribute("style","display:none; position: fixed; width: 400px; border: 1px solid rgb(51, 102, 153); padding: 10px; background-color: rgb(255, 255, 255); z-index: 2001; overflow: auto; text-align: center; top: 200px; left: calc(50% - 200px);");
//modalDialogParentDiv.setAttribute("style","position: fixed; width: 400px; border: 1px solid rgb(51, 102, 153); padding: 10px; background-color: rgb(255, 255, 255); z-index: 2001; overflow: auto; text-align: center; top: 280px; left: calc(50% - 200px);");

modalDialogSiblingDiv = document.createElement("div");

modalDialogTextDiv = document.createElement("div"); 
modalDialogTextDiv.setAttribute("style" , "text-align:center");
modalDialogTextDiv.id="dialogTextDiv";

modalDialogTextSpan = document.createElement("span"); 
modalDialogText = document.createElement("strong"); 
modalDialogText.id="textInfo"
modalDialogText.innerHTML = "Processing...  Please Wait.";

imageWrapper = document.createElement("div");
imageWrapper.style.cssText="margin-top:10px;";
imageElement = document.createElement("img"); 
imageElement.src = "https://cdn.isforma.com/web_assets/forma-logo@3x.png";
imageElement.style.cssText = "height:24px;width:24px;"+
"-webkit-animation-name: spin;"+
"-webkit-animation-duration: 4000ms;"+
"-webkit-animation-iteration-count: infinite;"+
"-webkit-animation-timing-function: linear;"+
"-moz-animation-name: spin;"+
"-moz-animation-duration: 4000ms;"+
"-moz-animation-iteration-count: infinite;"+
"-moz-animation-timing-function: linear;"
imageWrapper.appendChild(imageElement);

modalDialogTextSpan.appendChild(modalDialogText);
modalDialogTextDiv.appendChild(modalDialogTextSpan);

modalDialogTextDiv.appendChild(imageWrapper);

modalDialogImageDiv = document.createElement("div"); 
modalDialogImageDiv.setAttribute("style" , "text-align:center;display:none");
modalDialogImageDiv.id="dialogImageDiv";

tryonImage =  document.createElement("img");
tryonImage.id="tryonImage";
tryonImage.style="width:375px;height:500px;";

modalDialogImageDiv.appendChild(tryonImage)

modalDialogSiblingDiv.appendChild(modalDialogTextDiv);
modalDialogSiblingDiv.appendChild(modalDialogImageDiv)
modalDialogParentDiv.appendChild(modalDialogSiblingDiv);

document.body.appendChild(wrapperDiv);
document.body.appendChild(modalDialogParentDiv);

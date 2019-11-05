
modalDialogSiblingDiv = document.createElement("div");

modalDialogTextDiv = document.createElement("div"); 
modalDialogTextDiv.setAttribute("style" , "text-align:center");

modalDialogTextSpan = document.createElement("span"); 
modalDialogText = document.createElement("strong"); 
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

modalDialogSiblingDiv.appendChild(modalDialogTextDiv);
modalDialogParentDiv.appendChild(modalDialogSiblingDiv);
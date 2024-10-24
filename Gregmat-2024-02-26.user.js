// ==UserScript==
// @name         Gregmat
// @namespace    http://tampermonkey.net/
// @version      2024-02-26
// @description  try to take over the world!
// @author       You
// @match        https://www.gregmat.com/skill-building/type/pairing
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gregmat.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

var css=`
#meaningEl{
    display:none;
    position: absolute;
    border-radius: 10px;
    border: 2px solid #73AD21;
    padding: 20px;
    background: rgba(255, 255, 255, 0.90);
    width:calc(100% - 100px);
    margin-left:20px;
}
.hidden{
    display:none;
}
`;
var style = document.createElement('style');
style.innerHTML = css;
document.head.appendChild(style);

function logCatch(a){
    if(typeof(a)!='string'){
        GM_xmlhttpRequest({
            method: "POST",
            url: "http://localhost/pairs/save.php",
            data: JSON.stringify(a)
        });
    }
};
document.log = logCatch;

function hijack(){
    function getElement(tag, text){
        var aTags = document.getElementsByTagName(tag);
        var searchText = text;
        var found;

        for (var i = 0; i < aTags.length; i++) {
            if (aTags[i].textContent == searchText) {
                found = aTags[i];
                break;
            }
        }
        return found;
    }

    var scriptText = "console.log = document.log";
    var rwscript = document.createElement("script");
    rwscript.type = "text/javascript";
    rwscript.textContent = scriptText;
    document.documentElement.appendChild(rwscript);
    rwscript.parentNode.removeChild(rwscript);

    setInterval(()=>{
    getElement("button","Check Answer").click();
    getElement("span","Next").click();
    },500);
}

function clearSelection(){
    if (window.getSelection) {
        if (window.getSelection().empty) { // Chrome
            window.getSelection().empty();
        } else if (window.getSelection().removeAllRanges) { // Firefox
            window.getSelection().removeAllRanges();
        }
    } else if (document.selection) { // IE?
        document.selection.empty();
    }
}

//https://stackoverflow.com/questions/7380190/select-whole-word-with-getselection
//(modified)
function snapSelectionToWord() {
    var sel;
    // Check for existence of window.getSelection() and that it has a
    // modify() method. IE 9 has both selection APIs but no modify() method.
    if (window.getSelection && (sel = window.getSelection()).modify) {
        sel = window.getSelection();
        return sel.toString();
    } else if ( (sel = document.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        return textRange.text;
    }
}
    //https://stackoverflow.com/questions/6846230/coordinates-of-selected-text-in-browser-page
    //modified
    function getSelectionCoords(win) {
        win = win || window;
        var doc = win.document;
        var sel = doc.selection, range, rects, rect;
        var x = 0, y = 0;
        if (sel) {
            if (sel.type != "Control") {
                range = sel.createRange();
                range.collapse(true);
                x = range.boundingLeft;
                y = range.boundingTop+range.boundingHeight;
            }
        } else if (win.getSelection) {
            sel = win.getSelection();
            if (sel.rangeCount) {
                range = sel.getRangeAt(0).cloneRange();
                if (range.getClientRects) {
                    range.collapse(true);
                    rects = range.getClientRects();
                    if (rects.length > 0) {
                        rect = rects[0];
                    }
                    x = rect.left;
                    y = rect.bottom;
                }
                // Fall back to inserting a temporary element
                if (x == 0 && y == 0) {
                    var span = doc.createElement("span");
                    if (span.getClientRects) {
                        // Ensure span has dimensions and position by
                        // adding a zero-width space character
                        span.appendChild( doc.createTextNode("\u200b") );
                        range.insertNode(span);
                        rect = span.getClientRects()[0];
                        x = rect.left;
                        y = rect.bottom;
                        var spanParent = span.parentNode;
                        spanParent.removeChild(span);

                        // Glue any broken text nodes back together
                        spanParent.normalize();
                    }
                }
            }
        }
        return { x: x, y: y };
    }



var start = () => {
    console.log('Started');
    var selectionMode=2;
    function logSelection(event) {
        var txt = snapSelectionToWord();
        if(!txt)return;
        if(selectionMode==0){
            //highlight('yellow');
            removeSelection();
            return;
        }
        txt = txt.replace(/[^\w\s]/gi, '')
        var cords = getSelectionCoords();
        //meaningEl.style.left = `${cords.x}px`;
        var top = (window.pageYOffset || document.scrollTop) - (document.clientTop || 0);
        meaningEl.style.top = `${cords.y+top}px`;
        function thesLoad(txt){
            GM_xmlhttpRequest({
                method: "GET",
                url: "http://localhost/meaning/?word="+txt,
                onload: function(response) {
                    meaningEl.style.display='block';
                    meaningEl.innerHTML = response.responseText;
                }
            });
        }
        if(selectionMode==1){
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://api.dictionaryapi.dev/api/v2/entries/en/"+txt,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function(response) {
                    var r = JSON.parse(response.responseText);
                    if(r.title=='No Definitions Found'){
                        //auto thes
                        thesLoad(txt);
                    }else{
                        meaningEl.style.display='block';
                        //meaningEl.innerHTML = getMeaningHTML(r);
                    }
                }
            });
        }else if(selectionMode==2){
            thesLoad(txt);
        }
    };

    function removeSelection(event){
        meaningEl.style.display='none';
        clearSelection();
    }


    var meaningEl = document.createElement("div");
    meaningEl.setAttribute("id", "meaningEl");

    //var mainEl = document.getElementsByClassName('flex flex-col space-y-1')[1].parentElement.parentElement.parentElement;
    document.body.addEventListener("mouseup", logSelection);
    document.body.addEventListener("mousedown", removeSelection);
    //mainEl.parentElement.addEventListener("click", removeSelection);

    document.body.appendChild(meaningEl);
    meaningEl.onclick = removeSelection;
    //window.onkeypress = function(){selectionMode=(selectionMode+1)%3};
    //console.log('starting hijack');
    //hijack();
};

setTimeout(start, 1000);
---
layout: default
title: MuMuBrowser
---

MuMuBrowser

Email:oldcwj@gmail.com

<a onClick="loadScript('/js/main.js')">Math</a>

<a onClick="loadScript('/js/apptools.js')">App Tools</a>

<a onClick="loadScript('/js/lockscreen.js')">Math</a>

<script>
function run(){
  //document.getElementById("field2").value=document.getElementById("field1").value;
  window.compile.run("toast('Hi')")
}
function loadScript(url){ 
    xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = Callback;
    xmlHttp.open("GET", url, true ); // 读取mytxt.txt内容
    xmlHttp.send(null); 
 
    function Callback(){
      if (xmlHttp.readyState == 4 ) {
        if (xmlHttp.status == 200 ) {
          xml = xmlHttp.responseText;
          window.compile.run(xml);
        }
      }
    }
}
</script>

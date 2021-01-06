"ui";

ui.layout(
    <vertical>
        <appbar>
             <toolbar id="toolbar" title="n次方计算"/>
        </appbar>

         <!-- hint属性用来设置输入框的提示-->
         <text text="x的n次方" textColor="black" textSize="16sp" marginTop="16" gravity="center" />

         <!-- inputType属性用来设置输入类型，包括number, email, phone等-->
         <text text="输入x的值" textColor="black" textSize="16sp" marginTop="16"/>
         <input id="x" inputType="number" text=""/>

         <text text="输入n的值" textColor="black" textSize="16sp" marginTop="16"/>
         <input id="n" inputType="number" text=""/>

         <button id="ok" text="计算" style="Widget.AppCompat.Button.Colored" gravity="center"/>

         <text id="result" text="结果：" textColor="black" textSize="16sp" marginTop="16"/>
    </vertical>
);

ui.ok.click(()=>{
    var x = ui.x.text();
    var n = ui.n.text();
    if(x.length == 0){
        ui.x.setError("输入不能为空");
        return;
    }
    if (n.length == 0) {
        ui.n.setError("输入不能为空");
        return;
    }
    var x = parseInt(x);
    ui.result.setText("结果：" + Math.pow(x, n))
});


toast("Hello, MuMuBrowser");
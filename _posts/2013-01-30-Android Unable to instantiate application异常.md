---
layout: post
---

今天在安装程序时遇到如下异常：
> E/AndroidRuntime(29551): FATAL EXCEPTION: main
> E/AndroidRuntime(29551): java.lang.RuntimeException: Unable to instantiate application com.cuiwenjun.activity.MyApplication: 
java.lang.ClassNotFoundException: com.cuiwenjun.activity.MyApplication
E/AndroidRuntime(29551):  at android.app.LoadedApk.makeApplication(LoadedApk.java:482)
E/AndroidRuntime(29551):   at android.app.ActivityThread.handleBindApplication(ActivityThread.java:3960)
E/AndroidRuntime(29551): 	at android.app.ActivityThread.access$1300(ActivityThread.java:123)
E/AndroidRuntime(29551): 	at android.app.ActivityThread$H.handleMessage(ActivityThread.java:1207)
E/AndroidRuntime(29551): 	at android.os.Handler.dispatchMessage(Handler.java:99)
E/AndroidRuntime(29551): 	at android.os.Looper.loop(Looper.java:137)
E/AndroidRuntime(29551): 	at android.app.ActivityThread.main(ActivityThread.java:4446)
E/AndroidRuntime(29551): 	at java.lang.reflect.Method.invokeNative(Native Method)
E/AndroidRuntime(29551): 	at java.lang.reflect.Method.invoke(Method.java:511)
E/AndroidRuntime(29551): 	at com.android.internal.os.ZygoteInit$MethodAndArgsCaller.run(ZygoteInit.java:784)
E/AndroidRuntime(29551): 	at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:551)
E/AndroidRuntime(29551): 	at dalvik.system.NativeStart.main(Native Method)
E/AndroidRuntime(29551): Caused by: java.lang.ClassNotFoundException: com.cuiwenjun.activity.MyApplication
E/AndroidRuntime(29551): 	at dalvik.system.BaseDexClassLoader.findClass(BaseDexClassLoader.java:61)
E/AndroidRuntime(29551): 	at java.lang.ClassLoader.loadClass(ClassLoader.java:501)
E/AndroidRuntime(29551): 	at java.lang.ClassLoader.loadClass(ClassLoader.java:461)
E/AndroidRuntime(29551): 	at android.app.Instrumentation.newApplication(Instrumentation.java:942)
E/AndroidRuntime(29551): 	at android.app.LoadedApk.makeApplication(LoadedApk.java:477)
E/AndroidRuntime(29551): 	... 11 more

  在AndroidManifest.xml中的<application>节点处是以.MyApplication做为android:name的值的，但是其它的activity都是包名＋activity,
将application也换成包名＋application后重新安装后没有问题，猜测是由于Android对AndroidManifest.xml有缓存机制，修改AndroidManifest.xml
后才会重新加载

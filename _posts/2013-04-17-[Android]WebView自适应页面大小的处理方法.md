---
layout: post
---
四种WebView自适应大小的方法

第一种：
<pre><code>
    WebSetting mSettings = mWebView.getSettings();
    mSettings.setUseWideViewPort(true);
    mSettings.setLoadWithOverviewMode(true);
</code></pre>
第二种：
<pre><code>
    WebSetting mSettings = mWebView.getSettings();
    mSettings.setLayoutAlgorithm(LayoutAlgorithm.SINGLE_COLUMN);
</code></pre>
第三种：
<pre><code>
    DisplayMetrics metrics = new DisplayMetrics();
    getWindowManager().getDefaultDisplay().getMetrics(metrics);
    int density = metrics.densityDpi;
    if (density == 120) {
        settings.setDefaultZoom(ZoomDensity.CLOSE);
    }else if (density == 160) {
        settings.setDefaultZoom(ZoomDensity.MEDIUM);
    }else if (density == 240) {
        settings.setDefaultZoom(ZoomDensity.FAR);
    }
</code></pre>
第四种：
<pre><code>
    WebSetting mSettings = mWebView.getSettings();
    mSettings.setUseWideViewPort(true);
    mWebView.setInitialScale(90);
</code></pre>
    

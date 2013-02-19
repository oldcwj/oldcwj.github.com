---
layout: post
---

<pre><code>class Article
  include Mongoid::Document
  field :name
  field :content
  field :published_on, type: Date
end</code></pre>

在视图中获取值：

    <%= f.date_select :published_on  %> 

当创建一个article成功后，在展现的html中published_on对应的是空的，但是数据库中确实存在了，不是published_on而是

变成了三个属性published_on(1i) 、published_on(2i) 和published_on(3i)。

需要在article的model中添加一行

    include Mongoid::MultiParameterAttributes

---
layout: default
title: The archives
permalink: /archives/
date: 2002-09-09
---
<div class="meta">{{ page.date | | date: "%b %d, %Y"  }}</div>

##[{{ page.title }}]({{ page.url }})

All the entries ever written ({{ site.posts | size }} of them) show below, most current at the top ([go to the bottom](#bottom)). This list will eventually (or not) get quite long, which will increase the loading time of this page. Sorry about that.

<ul class="archives">
{% for post in site.posts %}
<li><time>{{ post.date | date: "%b %d, %Y" }}</time> <span class="spacer">&mdash;</span> <a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
</ul>

<div id="bottom"><p>Ops! You reached the bottom of the page.</p></div>
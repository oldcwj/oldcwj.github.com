---
layout: post
---

    ls -Ral ./ |grep .svn|grep .svn:$|sed 's/://'|xargs rm -rf

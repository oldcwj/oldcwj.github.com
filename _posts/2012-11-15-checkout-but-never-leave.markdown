---
layout: post
title: Can checkout but never leave!
---
This really I don’t understand. And it relates, again, to Amazon.

They have a new service, [Glacier](http://aws.amazon.com/glacier/), which allows for very cheap archival of data, the catch been on the price for retrieval. On Glacier you create “vaults”, which are the equivalent of “buckets” on [S3](http://aws.amazon.com/s3/), and anything inside them is considered “archives.” So far, so good.

The incomprehensible thing comes when, for example, an application that uses Glacier to store it’s files misbehaves and leaves “archives” behind, inside “vaults.” I can log into the Glacier Management Console, I can see the vaults, and archives, but can’t delete. Not from the Amazon provided console! And if you call them, there is nothing they can do -- not the basic support, that is. That is a basic function!

Really starting to feel disappointed at Amazon.
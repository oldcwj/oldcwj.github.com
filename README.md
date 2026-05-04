# Coobbi.com Website

This is a static website ready to deploy to coobbi.com.

## Upload
Upload all files in this folder to your web root.

## Important files
- index.html: homepage
- apps.html: all apps
- tutorials.html: tutorial index
- sitemap.xml: submit this in Google Search Console
- robots.txt: allows search engines to crawl the site
- .htaccess: optional Apache 301 redirect example

## Recommended redirects
If you buy jarfileopener.com, set a 301 redirect to:
https://coobbi.com/jar-file-opener/

## After deploying
1. Open https://coobbi.com/sitemap.xml
2. Add coobbi.com to Google Search Console
3. Submit sitemap.xml
4. Set the website URL in Google Play Console developer profile


## Google Play Icons

This version uses the public Google Play CDN icon URLs for app icons.
They were taken from the public Google Play developer/app pages.
This works directly on GitHub Pages.

For maximum long-term stability, you can later download your own original 512x512 icons
from Play Console and replace these external image URLs with local files in `assets/icons/`.

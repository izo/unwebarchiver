<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:atom="http://www.w3.org/2005/Atom">
	<xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
	<xsl:template match="/">
		<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
				<meta charset="UTF-8" />
				<title>Unwebarchiver - <xsl:value-of select="/plist/dict[key='WebMainResource']/dict[key='WebResourceURL']/key[text()='WebResourceURL']/following-sibling::*[1]"/></title>
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
				<script src="/assets/js/atob.js"></script>
			</head>
			<body>
				<xsl:apply-templates select="/plist/dict" />
			</body>
		</html>
	</xsl:template>
	<xsl:template match="dict">
		<xsl:for-each select="key">
			<details>
				<summary><code><xsl:value-of select="."/></code></summary>
				<div style="padding-left:1rem">
					<pre><code>
						<xsl:apply-templates select="./following-sibling::*[1]" />
					</code></pre>
				</div>
			</details>
		</xsl:for-each>
	</xsl:template>
	<xsl:template match="data">
		<div class="data">
			<xsl:value-of select="." />
		</div>
	</xsl:template>
</xsl:stylesheet>

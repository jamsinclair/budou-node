# budou-node
[![npm version](https://badge.fury.io/js/budou.svg)](https://badge.fury.io/js/budou)
[![Build Status](https://travis-ci.org/jamsinclair/budou-node.svg?branch=master)](https://travis-ci.org/jamsinclair/budou-node)

Node.js port of https://github.com/google/budou:

> English uses spacing and hyphenation as cues to allow for beautiful and legible line breaks.
> Certain CJK languages have none of these, and are notoriously more difficult.
> Breaks occur randomly, usually in the middle of a word.
> This is a long standing issue in typography on web, and results in degradation of readability.
> 
> Budou automatically translates CJK sentences into organized HTML code
> with lexical chunks wrapped in non-breaking markup so as to semantically control line breaks.
> Budou uses [Google Cloud Natural Language API](https://cloud.google.com/natural-language/)
> (NL API) to analyze the input sentence, and it concatenates proper words in
> order to produce meaningful chunks utilizing part-of-speech (pos) tagging and
> syntactic information.
> Processed chunks are wrapped with `SPAN` tag, so semantic units will no longer
> be split at the end of a line by specifying their `display` property as
> `inline-block` in CSS.


## Install
Install budou-node using `npm`:
```shell
npm install budou
```
Or via `yarn`:
```shell
yarn add budou
```

## How to use
Get the parser by completing authentication with a credential file for NL API, which can be downloaded from [Google Cloud Platform](https://cloud.google.com)
by navigating through "API Manager" > "Credentials" > "Create credentials" >
"Service account key" > "JSON".

The path of file can be set as an ENV var, `GOOGLE_APPLICATION_CREDENTIALS` , or passed as 
an option to the `authenticate` method.

```js
const Budou = require('budou')

// Login to Cloud Natural Language API with credentials
const parser = Budou.authenticate({ keyFilename: '/path/to/credentials.json' })

// Set options and parse text for result
const options = { attributes: { class: 'wordwrap' }, language: 'ja' }
const result = await parser.parse('今日も元気です', options)

console.log(result.html)
// => "<span><span class="wordwrap">今日も</span><span class="wordwrap">元気です</span></span>"

console.log(result.chunks[0].word) // => "今日も"
console.log(result.chunks[1].word) // => "元気です"
```

To make the semantic units in the output HTML wrap correctly at the end of the line
target each `<span>` tag with `display: inline-block` in CSS.

```css
.wordwrap {
  display: inline-block;
}
```

## See Original Docs for:
- [How it works](https://github.com/google/budou#how-it-works)
- [Supported Language](https://github.com/google/budou#supported-language)
- [Where to use](https://github.com/google/budou#where-to-use)
- [Entity mode](https://github.com/google/budou#entity-mode)
- [Maximum chunk length](https://github.com/google/budou#maximum-chunk-length)
- [Accessibility](https://github.com/google/budou#accessibility)

## Options
`parser.parse(text, options)` method accepts options below in addition to the input text.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| attributes | Object | `{ class: 'ww' }` | A key-value mapping for attributes of output `<span>` tags. |
| useCache | Boolean | `true` | Whether to use caching. Helps reduce calls to NL API for repeated text. |
| language | String | `null` | Language of the text. If `null` is provided, NL API tries to detect from the input text. |
| useEntity | Boolean | `false` | Whether to use Entity mode. |
| maxLength | Number | `null` | Maximum chunk character length. If a chunk is longer than this it will not be wrapped in a `<span>` tag. |


## Pricing
> Budou is backed up by Google Natural Language API, so cost may be incurred when
> using that API.
> 
> In other languages including Japanese, the default parser uses *Syntax Analysis*
> and incurs cost according to monthly usage.
> If you enable Entity mode by specifying `use_entity=True`, the parser uses both
> of *Syntax Analysis* and *Entity Analysis*,
> which will incur additional cost.
> 
> Google Cloud Natural Language API has free quota to start testing the feature at
> free of cost, but please refer to [Google Cloud Natural Language API Pricing Guide]> (https://cloud.google.com/natural-language/pricing)
> for more detailed pricing information.
> - https://github.com/google/budou#pricing


## Disclaimer
This Node.js library was derived from the original Budou python library  https://github.com/google/budou licensed under Apache-2.0. In no way associated or endorsed.

# Vocabulary frequency source

`frequencywords-2018-en_50k.txt` is the English list from the pinned
[FrequencyWords 2018 source](https://github.com/hermitdave/FrequencyWords/tree/525f9b560de45753a5ea01069454e72e9aa541c6/content/2018/en).
The list is based on OpenSubtitles 2018 frequency counts. FrequencyWords identifies
its generated content as **CC BY-SA 4.0**; the code in that repository is separately
licensed MIT. The vocabulary rows generated from this source are adapted data and
remain under CC BY-SA 4.0. See the [license deed](https://creativecommons.org/licenses/by-sa/4.0/).

The project preserves the original 1-based row as `frequencyRank` and `sourceRank`.
It considers only the first 3,000 rows for this starter set, filters tokens that are
not standalone lexical forms, and does not renumber the remaining ranks. This means
the starter set contains fewer than 3,000 candidate words. It does not combine ranks
from NGSL, Oxford 3000, or another corpus.

Vietnamese meanings and sense records in `reviewed-content.json` are original
project-authored material. They are separate from the frequency source. A candidate
without reviewed meaning/sense metadata stays `draft` and is not offered in a game.

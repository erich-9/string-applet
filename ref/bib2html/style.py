from pybtex.style.formatting.alpha import Style as AlphaStyle
from pybtex.style.template import sentence, optional

class Style(AlphaStyle):
  def format_web_refs(self, e):
    return sentence [
        optional [ self.format_url(e) ],
        optional [ self.format_eprint(e) ],
        optional [ self.format_pubmed(e) ],
        optional [ self.format_doi(e) ],
        ]

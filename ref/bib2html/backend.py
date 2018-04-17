from xml.sax.saxutils import escape
from pybtex.backends.html import Backend as HtmlBackend
import pybtex.io

class Backend(HtmlBackend):
  default_suffix = '.html'
  symbols = {
    'ndash': '&ndash;',
    'newblock': '</span>\n<br />\n<span>',
    'nbsp': '&nbsp;'
  }

  def format_protected(self, text):
    return text

  def format_href(self, url, text):
    return r'<a href="{0}" target="_blank">{1}</a>'.format(url, text) if text else ''

  def format_tag(self, tag, text):
    if tag == 'em':
      fmt_str = r'<span class="bibtex-journal">{1}</span>'
    else:
      fmt_str = r'<{0}>{1}</{0}>'
    return fmt_str.format(tag, text) if text else ''

  def write_prologue(self):
    self.output('<dl>\n')

  def write_epilogue(self):
    self.output('</dl>\n')

  def write_entry(self, key, label, text):
    self.output('<dt>[%s]</dt>\n' % label)
    self.output('<dd>\n<span>%s</span>\n</dd>\n' % text)

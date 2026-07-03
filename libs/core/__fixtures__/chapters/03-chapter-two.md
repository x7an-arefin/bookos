# Chapter Two: Global Standards

In modern publishing, support for international typography and bidirectionality is crucial. The BookOS rendering engine is designed to support multi-lingual texts, including right-to-left layout constraints.

For instance, when typesetting bilingual materials, we ensure that Arabic script renders with proper directional attributes:

> الملاحة في الفضاء هي علم وتكنولوجيا توجيه المركبات الفضائية خارج الغلاف الجوي للأرض. يتطلب هذا العلم حسابات دقيقة للمسارات والتحكم في الدفع لضمان وصول المركبة إلى وجهتها بسلام.

Bidirectional rendering (Bidi) requires fonts that contain the correct glyph mappings. Without them, characters may render out of sequence or as empty boxes. The validator scans your book text and checks that the selected font file supports all characters utilized in your manuscript.

Here is a checklist of internationalization requirements:
- [x] Bidirectional text ordering (LTR / RTL support)
- [x] Custom language overrides at the chapter level
- [x] Multi-lingual font inspection and glyph coverage
- [x] Hyphenation rules for European languages

By adhering to these international guidelines, we ensure that literature from all cultures can be presented with the highest level of typographic quality.

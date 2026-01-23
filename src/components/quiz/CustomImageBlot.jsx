import { Quill } from 'react-quill';

const Image = Quill.import('formats/image');

class CustomImage extends Image {
  static create(value) {
    const node = super.create(value);
    if (typeof value === 'string') {
      node.setAttribute('src', this.sanitize(value));
    } else if (value) {
      node.setAttribute('src', this.sanitize(value.src));
      if (value.alt) node.setAttribute('alt', value.alt);
      if (value.width) node.setAttribute('width', value.width);
      if (value.height) node.setAttribute('height', value.height);
      if (value.style) node.setAttribute('style', value.style);
    }
    return node;
  }

  static value(node) {
    return {
      src: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      style: node.getAttribute('style')
    };
  }
}

CustomImage.blotName = 'image';
CustomImage.tagName = 'img';

export default CustomImage;
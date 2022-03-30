import {html, css, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Directive, directive} from 'lit/directive.js';
import {ElementPart, ChildPart, render} from 'lit';
import {setChildPartValue} from 'lit/directive-helpers.js';

import {computePosition, autoPlacement, offset, shift} from '@floating-ui/dom';

const enterEvents = ['mouseenter', 'focus'];
const leaveEvents = ['mouseleave', 'blur', 'keydown', 'click'];

@customElement('simple-tooltip')
export class SimpleTooltip extends LitElement {

  // Lazy creation
  static lazy(el: Element, callback: () => void) {
    enterEvents.forEach(name => el.addEventListener(name, callback, {once: true}));
  }

  static styles = css`
    :host {
      display: inline-block;
      position: fixed;
      padding: 4px;
      border: 1px solid darkgray;
      border-radius: 4px;
      background: #ccc;
      /* Fade in */
      opacity: 0;
      transform: scale(0.5);
      transition: opacity, transform;
      transition-duration:  0.33s;
    }

    :host([showing]) {
      opacity: 1;
      transform: scale(1);
    }
  `;

  @property({type: Number})
  offset = 4;

  // Attribute for styling "showing"
  @property({reflect: true, type: Boolean})
  showing = false;

  _target: Element|null = null;

  get target() {
    return this._target;
  }
  set target(target: Element|null) {
    // Remove events from existing target
    if (this.target) {
      enterEvents.forEach(name =>
        this.target!.removeEventListener(name, this.show));
      leaveEvents.forEach(name =>
        this.target!.removeEventListener(name, this.hide));
    }
    // Add events to new target
    if (target) {
      enterEvents.forEach(name =>
        target!.addEventListener(name, this.show));
      leaveEvents.forEach(name =>
        target!.addEventListener(name, this.hide));
    }
    this._target = target;
  }

  constructor() {
    super();
    // Finish hiding at end of animation
    this.addEventListener('transitionend', this.finishHide);
  }

  connectedCallback() {
    super.connectedCallback();
    this.target ??= this.previousElementSibling;
    this.finishHide();
  }

  render() {
    return html`<slot></slot>`;
  }

  show = () => {
    this.style.display = '';
    computePosition(this.target, this, {
      strategy: 'fixed',
      middleware: [
        offset(this.offset),
        shift(),
        autoPlacement({allowedPlacements: ['top', 'bottom']})
      ],
    }).then(({x, y}: {x: number, y: number}) => {
      this.style.left = `${x}px`;
      this.style.top = `${y}px`;
    });
    this.showing = true;
  }

  hide = () => {
    this.showing = false;
  }

  finishHide = () => {
    if (!this.showing) {
      this.style.display = 'none';
    }
  }

}

// Directive!
class TooltipDirective extends Directive {
  el?: Element;
  isSetup = false;
  renderPart?: ChildPart;
  result: unknown;
  render(value: unknown = '') {}
  update(part: ElementPart, [value]: Parameters<this['render']>) {
    this.result = html`<simple-tooltip>${value}</simple-tooltip>`;
    if (!this.isSetup) {
      this.isSetup = true;
      const el = part.element;
      SimpleTooltip.lazy(el, () => {
        const fragment = document.createDocumentFragment();
        this.renderPart = render(this.result, fragment, part.options);
        const tip = fragment.firstElementChild as SimpleTooltip;
        el.parentNode!.insertBefore(tip, el.nextSibling);
        tip.show();
      });
    } else if (this.renderPart) {
      setChildPartValue(this.renderPart, this.result);
    }
  }
}

export const tooltip = directive(TooltipDirective);

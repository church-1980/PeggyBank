/**
 * BRAND LOGOS AND THE SUBSCRIPTION ICON.
 *
 * Two defects seen on a real screen:
 *
 * 1. Merchant logos were pushed through the concept-icon frame with
 *    resizeMode "cover" inside a circular mask. TD, Bell, Hyundai and the rest
 *    were scaled up until they filled a square and then had their corners cut
 *    off. A wide mark lost its ends and its corners at once.
 *
 * 2. Every generic subscription rendered as a GAME CONTROLLER. The
 *    subscriptions table stores no category, so the 'fun' fallback fired every
 *    time: a gym membership, an audiobook plan and cloud storage were all drawn
 *    as video games.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Image } from 'react-native';
import PeggyBrandMark, { BRAND_MARK_FILL } from '../components/peggy/PeggyBrandMark';
import PeggyIconFrame from '../components/peggy/PeggyIconFrame';
import { subscriptionIconKey, ICON_REGISTRY } from '../data/iconRegistry';

/** Flattened style of the first <Image> rendered. */
function imageStyle(tree: any) {
  const img = tree.UNSAFE_getAllByType(Image)[0];
  const s = img.props.style;
  return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s;
}
function imageProps(tree: any) {
  return tree.UNSAFE_getAllByType(Image)[0].props;
}

describe('A merchant logo keeps its own shape', () => {
  const logo = { uri: 'file:///td.png' };

  it('THE FIX: uses contain, never the destructive cover', () => {
    const t = render(<PeggyBrandMark source={logo} size={64} />);
    const props = imageProps(t);
    const style = imageStyle(t);
    // resizeMode may be a prop or a style key depending on the platform shim.
    expect(props.resizeMode ?? style.resizeMode).toBe('contain');
    expect(props.resizeMode ?? style.resizeMode).not.toBe('cover');
  });

  it('leaves breathing room instead of filling edge to edge', () => {
    const t = render(<PeggyBrandMark source={logo} size={64} />);
    const style = imageStyle(t);
    expect(style.width).toBe(Math.round(64 * BRAND_MARK_FILL));
    expect(style.width).toBeLessThan(64);
  });

  it('keeps a fixed footprint, so a wide logo cannot make a row taller', () => {
    for (const size of [40, 64, 96]) {
      const t = render(<PeggyBrandMark source={logo} size={size} />);
      const box = t.toJSON() as any;
      const s = Array.isArray(box.props.style) ? Object.assign({}, ...box.props.style.filter(Boolean)) : box.props.style;
      expect(s.width).toBe(size);
      expect(s.height).toBe(size);
    }
  });

  it('is a rounded SQUARE, not a circular mask', () => {
    const t = render(<PeggyBrandMark source={logo} size={64} />);
    const box = t.toJSON() as any;
    const s = Array.isArray(box.props.style) ? Object.assign({}, ...box.props.style.filter(Boolean)) : box.props.style;
    expect(s.borderRadius).toBeLessThan(32);        // a circle at this size would be 32
    expect(s.overflow).not.toBe('hidden');          // a safe area, not a mask
  });

  it('the concept frame hands a logo over instead of cropping it itself', () => {
    const t = render(<PeggyIconFrame iconKey="bills" size="card" shape="circle" overrideSource={logo} />);
    const props = imageProps(t);
    const style = imageStyle(t);
    expect(props.resizeMode ?? style.resizeMode).toBe('contain');
  });

  it('PeggyBank concept art still fills its circular frame as before', () => {
    const t = render(<PeggyIconFrame iconKey="bills" size="card" shape="circle" />);
    const box = t.toJSON() as any;
    const s = Array.isArray(box.props.style) ? Object.assign({}, ...box.props.style.filter(Boolean)) : box.props.style;
    expect(s.overflow).toBe('hidden');              // unchanged for our own artwork
  });
});

describe('A subscription is a recurring payment, not a video game', () => {
  it('THE FIX: a subscription with no category is not "fun"', () => {
    expect(subscriptionIconKey(undefined)).toBe('recurring');
    expect(subscriptionIconKey(undefined)).not.toBe('fun');
  });

  it('the generic subscription icon does not depict gaming', () => {
    const entry = ICON_REGISTRY[subscriptionIconKey(undefined)];
    expect(entry.ionicon).not.toBe('game-controller-outline');
    expect(entry.ionicon).toBe('repeat-outline');
  });

  it('reads as "recurring" rather than any one industry', () => {
    const entry = ICON_REGISTRY[subscriptionIconKey(undefined)];
    expect(entry.label).toBe('Recurring');
    // A television or play button would be as wrong as a controller: a
    // subscription can be a gym, a newspaper, software or storage.
    expect(entry.ionicon).not.toMatch(/tv|play|film|game/i);
  });

  it("'other' is treated as no category, not as a category", () => {
    expect(subscriptionIconKey('other')).toBe('recurring');
  });

  it('a real category still wins over the generic fallback', () => {
    expect(subscriptionIconKey('health')).toBe('health');
    expect(subscriptionIconKey('travel')).toBe('travel');
  });

  it('the artwork it points at actually exists', () => {
    expect(ICON_REGISTRY.recurring.image).toBeTruthy();
    expect(ICON_REGISTRY.recurring.status).toBe('ready');
  });
});

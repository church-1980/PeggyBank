import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PeggyIconFrame from './peggy/PeggyIconFrame';
import { IconKey } from '../data/iconRegistry';

/**
 * DEPRECATED — kept only so existing call sites keep compiling.
 *
 * This used to be a SECOND, independent implementation of the concept-icon
 * container, competing with PeggyIconFrame: its own box, its own radius, its own
 * tint maths, its own artwork sizing. Two implementations meant two appearances
 * for the same idea, which is why icons drifted between screens.
 *
 * It is now a thin adapter over PeggyIconFrame, so there is exactly ONE
 * implementation of concept-icon framing in the app. Nothing here decides how an
 * icon looks any more.
 *
 * Do not use in new code. Use PeggyIconFrame directly:
 *     <PeggyIconFrame iconKey="bills" size="card" shape="tile" />
 */

interface Props {
  iconKey: IconKey;
  color: string;
  size?: number;
  iconSize?: number;      // ignored: artwork scale is owned by PeggyIconFrame
  tinted?: boolean;
  overrideSource?: any;
  style?: StyleProp<ViewStyle>;
}

export default function IconBadge({
  iconKey, color, size, tinted = true, overrideSource, style,
}: Props) {
  return (
    <PeggyIconFrame
      iconKey={iconKey}
      tone={color}
      size={size}
      shape="tile"
      tinted={tinted}
      overrideSource={overrideSource}
      style={style}
    />
  );
}

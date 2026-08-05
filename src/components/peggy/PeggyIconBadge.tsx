import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import PeggyIconFrame from './PeggyIconFrame';
import { IconKey } from '../../data/iconRegistry';

/**
 * PeggyIconBadge — DEPRECATED shim. Kept so existing call sites keep working
 * while screens migrate. It now delegates entirely to the canonical
 * PeggyIconFrame, so there is exactly ONE icon-container implementation.
 *
 * New code should use <PeggyIconFrame iconKey=… size="card" … /> directly.
 */

interface Props {
  iconKey: IconKey;
  color?: string;                    // legacy tone override
  size?: number;                     // legacy raw size
  iconSize?: number;                 // ignored — frame scales artwork proportionally
  shape?: 'circle' | 'square';
  bg?: string;
  tinted?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function PeggyIconBadge({
  iconKey, color, size = 40, shape = 'circle', bg, tinted = true, style, testID,
}: Props) {
  return (
    <PeggyIconFrame
      iconKey={iconKey}
      size={size}
      shape={shape === 'square' ? 'tile' : 'circle'}
      tone={color}
      bg={bg}
      tinted={tinted}
      style={style}
      testID={testID}
    />
  );
}

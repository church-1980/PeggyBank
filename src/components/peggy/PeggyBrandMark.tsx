import React from 'react';
import { View, Image, StyleProp, ViewStyle } from 'react-native';
import { Radius } from '../../theme';
import { useColors } from '../../context/ThemeContext';

/**
 * PeggyBrandMark — someone else's logo, shown the way they drew it.
 *
 * A BRAND LOGO IS NOT A PEGGYBANK CONCEPT ICON.
 *
 * PeggyBank's own artwork is drawn to a square, so the concept frame can crop
 * it to a circle safely. A company's logo is not: TD is a square, Hyundai is
 * wide, some marks are tall. Those were being pushed through the concept frame
 * with resizeMode "cover" inside a circular mask, which scaled each logo up
 * until it filled a square and then cut the corners off. A wide mark lost its
 * ends and its corners at once. It made real companies look wrong, which is
 * both a design failure and, for a bank or a utility, a recognisability one.
 *
 * The rules here:
 *   - "contain", never "cover", so nothing is ever cut off
 *   - the logo's own proportions are kept; nothing is stretched
 *   - a rounded SQUARE safe area, not a circular mask
 *   - a fixed outer footprint, so a wide logo cannot make a list row taller
 *     and a tall one cannot make it wider -- rows stay aligned whatever the shape
 *   - a plain light surface, because many logos assume they sit on white and
 *     transparent PNGs would otherwise vanish into a dark theme
 *
 * We do not redesign anyone's logo. We give it room and get out of the way.
 */

interface Props {
  source: any;                      // { uri } or a required asset
  size: number;                     // the outer box, matching the concept frame's footprint
  /** Accessible name. Pass undefined when the merchant name is already read out nearby. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * How much of the box the artwork may occupy. The remainder is breathing room:
 * logos are designed with their own margins and look cramped edge to edge.
 */
export const BRAND_MARK_FILL = 0.78;

export default function PeggyBrandMark({ source, size, accessibilityLabel, style, testID }: Props) {
  const C = useColors();
  const inner = Math.round(size * BRAND_MARK_FILL);

  return (
    <View
      testID={testID}
      style={[
        {
          width: size,
          height: size,
          borderRadius: Radius.tile,     // rounded square, deliberately not a circle
          backgroundColor: '#FFFFFF',    // logos are drawn for white; keeps transparent PNGs visible
          borderWidth: 1,
          borderColor: C.border,
          alignItems: 'center',
          justifyContent: 'center',
          // No overflow:'hidden'. The box is a SAFE AREA, not a mask -- clipping
          // is the whole defect this component exists to remove.
        },
        style,
      ]}
      // A logo next to the merchant's own name is decoration; announcing it
      // again just makes a screen reader say everything twice.
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      <Image
        source={source}
        style={{ width: inner, height: inner }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

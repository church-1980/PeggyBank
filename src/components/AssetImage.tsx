// AssetImage — single swap-point for all images in the app.
//
// When a real image is ready:
//   1. Place the file in assets/images/<key>.jpg
//   2. Uncomment its line in src/assets/imageAssets.ts
//
// Nothing in this component or any screen needs to change.
// The placeholder automatically disappears when the asset is available.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IMAGE_ASSETS } from '../assets/imageAssets';
import { getImageSpec } from '../data/imageRegistry';
import { Radius, Typography, Spacing } from '../theme';

interface Props {
  imageKey: string;
  height?:  number;
  tint?:    string;   // hex colour — used for placeholder tinting only
  style?:   object;  // additional outer container style
}

export default function AssetImage({ imageKey, height = 200, tint = '#888888', style }: Props) {
  const asset = IMAGE_ASSETS[imageKey];

  if (asset) {
    return (
      <Image
        source={asset}
        style={[styles.image, { height }, style]}
        resizeMode="cover"
        accessibilityLabel={getImageSpec(imageKey)?.placeholderLabel}
      />
    );
  }

  // Placeholder — uses the registry label so it describes what will be here,
  // not just "Photo coming soon"
  const spec  = getImageSpec(imageKey);
  const label = spec?.placeholderLabel ?? 'Photo coming soon';

  return (
    <View style={[
      styles.placeholder,
      { height, backgroundColor: tint + '10', borderColor: tint + '33' },
      style,
    ]}>
      <Ionicons name="image-outline" size={32} color={tint + '70'} />
      <Text style={[styles.label, { color: tint + '99' }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width:        '100%',
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  placeholder: {
    width:          '100%',
    borderRadius:   Radius.lg,
    borderWidth:    1,
    borderStyle:    'dashed',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
    marginBottom:   Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  label: {
    ...Typography.smallBold,
    textAlign: 'center',
  },
});

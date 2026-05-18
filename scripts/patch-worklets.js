#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Fix @react-navigation/bottom-tabs BottomTabBar — remove pointerEvents string values.
//    RN 0.81.5 Fabric rejects string values for pointerEvents (expects boolean) on both
//    direct props and style objects. The tab bar already hides via translateY + position:absolute,
//    so removing pointerEvents is safe and eliminates the render crash.
const tabBarFile = path.join(__dirname, '..', 'node_modules', '@react-navigation', 'bottom-tabs', 'lib', 'module', 'views', 'BottomTabBar.js');
if (fs.existsSync(tabBarFile)) {
  let src = fs.readFileSync(tabBarFile, 'utf8');

  // Pattern A: original file (unpatched) — pointerEvents as direct Animated.View prop + direct View prop
  const beforeA = `}], tabBarStyle],\n    pointerEvents: isTabBarHidden ? 'none' : 'auto',\n    onLayout: sidebar ? undefined : handleLayout,\n    children: [/*#__PURE__*/_jsx(View, {\n      pointerEvents: "none",\n      style: StyleSheet.absoluteFill,`;
  const afterA  = `}], tabBarStyle],\n    onLayout: sidebar ? undefined : handleLayout,\n    children: [/*#__PURE__*/_jsx(View, {\n      style: StyleSheet.absoluteFill,`;

  // Pattern B: previously patched (pointerEvents moved to style objects)
  const beforeB = `}], tabBarStyle, {\n    pointerEvents: isTabBarHidden ? 'none' : 'auto'\n    }],\n    onLayout: sidebar ? undefined : handleLayout,\n    children: [/*#__PURE__*/_jsx(View, {\n      style: [StyleSheet.absoluteFill, {\n      pointerEvents: 'none'\n      }],`;
  const afterB  = `}], tabBarStyle],\n    onLayout: sidebar ? undefined : handleLayout,\n    children: [/*#__PURE__*/_jsx(View, {\n      style: StyleSheet.absoluteFill,`;

  if (src.includes(beforeA)) {
    fs.writeFileSync(tabBarFile, src.replace(beforeA, afterA), 'utf8');
    console.log('✓ BottomTabBar pointerEvents removido (fix A)');
  } else if (src.includes(beforeB)) {
    fs.writeFileSync(tabBarFile, src.replace(beforeB, afterB), 'utf8');
    console.log('✓ BottomTabBar pointerEvents removido (fix B)');
  } else {
    console.log('⚠ BottomTabBar já patchado ou versão diferente — pulando');
  }
}

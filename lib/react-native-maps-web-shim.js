import React from "react";
import { View } from "react-native";

const MapView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ...props, ref });
});

MapView.displayName = "MapView";

export const Marker = (props) => null;
export const Circle = (props) => null;
export const Polygon = (props) => null;
export const Polyline = (props) => null;
export const Callout = (props) => null;
export const Overlay = (props) => null;
export const Heatmap = (props) => null;
export const PROVIDER_GOOGLE = "google";
export const PROVIDER_DEFAULT = null;

export default MapView;

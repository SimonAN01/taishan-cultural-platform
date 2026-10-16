// Fit the full concept artwork before the visitor deliberately zooms in.
export function artworkCameraDistance(aspect,fov=38,width=8.2,height=5.2){
  return Math.max(height,width/aspect)/(2*Math.tan(fov*Math.PI/360))*1.15;
}

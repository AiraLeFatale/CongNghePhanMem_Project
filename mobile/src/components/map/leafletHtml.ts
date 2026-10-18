/** Trang HTML Leaflet chạy trong WebView. Leaflet được nhúng sẵn nên không cần CDN. */
import { LEAFLET_CSS, LEAFLET_JS } from './leafletAssets.generated';

export function buildLeafletHtml(center: { latitude: number; longitude: number }): string {
  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${LEAFLET_CSS}
html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#e8eef2;font-family:-apple-system,Roboto,sans-serif}
.lbl{background:rgba(255,255,255,.92);border:none;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.25);font-size:11px;font-weight:600;padding:2px 6px;color:#1b2b34}
.lbl:before{display:none}
.me{width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 2px rgba(26,115,232,.35)}
.me.sim{background:#8e24aa;box-shadow:0 0 0 2px rgba(142,36,170,.35)}
</style></head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
(function(){
  var post=function(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));};
  var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${center.latitude},${center.longitude}],16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',{
    maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  var poiLayer=L.layerGroup().addTo(map), pathLayer=L.layerGroup().addTo(map), meLayer=L.layerGroup().addTo(map);
  var fitted=false, lastMe=null;
  map.on('click',function(e){post({type:'tapMap',latitude:e.latlng.lat,longitude:e.latlng.lng});});
  window.__update=function(d){
    poiLayer.clearLayers(); pathLayer.clearLayers(); meLayer.clearLayers();
    var bounds=[];
    (d.pois||[]).forEach(function(p){
      var c=L.circle([p.lat,p.lng],{radius:p.r,color:p.color,weight:p.strong?3:2,fillColor:p.color,fillOpacity:p.strong?0.35:0.18});
      c.on('click',function(ev){L.DomEvent.stopPropagation(ev);post({type:'tapPoi',id:p.id});});
      c.bindTooltip(p.label,{permanent:true,direction:'top',className:'lbl',offset:[0,-4]});
      c.addTo(poiLayer);
      var dot=L.circleMarker([p.lat,p.lng],{radius:5,color:'#fff',weight:2,fillColor:p.color,fillOpacity:1});
      dot.on('click',function(ev){L.DomEvent.stopPropagation(ev);post({type:'tapPoi',id:p.id});});
      dot.addTo(poiLayer);
      bounds.push([p.lat,p.lng]);
    });
    if(d.path&&d.path.length>1){L.polyline(d.path,{color:'#ef6c00',weight:3,dashArray:'6 6',opacity:.8}).addTo(pathLayer);}
    if(d.me){
      L.marker([d.me.lat,d.me.lng],{icon:L.divIcon({className:'',html:'<div class="me'+(d.me.sim?' sim':'')+'"></div>',iconSize:[22,22],iconAnchor:[11,11]}),interactive:false}).addTo(meLayer);
      if(d.me.acc&&d.me.acc>10){L.circle([d.me.lat,d.me.lng],{radius:d.me.acc,color:'#1a73e8',weight:1,fillOpacity:.08,interactive:false}).addTo(meLayer);}
    }
    if(!fitted&&bounds.length){fitted=true;map.fitBounds(bounds,{padding:[40,40],maxZoom:17});}
    if(d.follow&&d.me){
      var key=d.me.lat.toFixed(5)+','+d.me.lng.toFixed(5);
      if(key!==lastMe){lastMe=key; if(!map.getBounds().pad(-0.15).contains([d.me.lat,d.me.lng])) map.panTo([d.me.lat,d.me.lng]);}
    }
  };
  window.__center=function(lat,lng){map.setView([lat,lng],Math.max(map.getZoom(),16));};
  post({type:'ready'});
})();
</script></body></html>`;
}

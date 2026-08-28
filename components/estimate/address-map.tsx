'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { Crosshair, LocateFixed, MoveDown, MoveLeft, MoveRight, MoveUp } from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import type { EstimateLocation } from '@/lib/calculator/types';
import { inferProvinceFromCoordinates, mapProvider } from '@/lib/maps/provider';
import type { Locale } from '@/config/i18n';

type AddressMapProps = {
  locale: Locale;
  location: EstimateLocation;
  onChange: (location: EstimateLocation) => void;
};

export default function AddressMap({ locale, location, onChange }: AddressMapProps) {
  const english = locale === 'en';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const latestLocation = useRef(location);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState(english ? 'Loading the confirmation map…' : 'กำลังโหลดแผนที่ยืนยันตำแหน่ง…');
  const [tileFailed, setTileFailed] = useState(false);

  useEffect(() => { latestLocation.current = location; }, [location]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    let disposed = false;
    async function initialise() {
      if (!containerRef.current || mapRef.current) return;
      try {
        const L = await import('leaflet');
        if (disposed || !containerRef.current) return;
        const map = L.map(containerRef.current, {
          center: [latestLocation.current.latitude, latestLocation.current.longitude],
          zoom: latestLocation.current.province === 'other' ? 7 : 16,
          scrollWheelZoom: false,
          zoomControl: true,
        });
        mapRef.current = map;
        const markerIcon = L.divIcon({
          className: 'solarmatch-map-marker-wrap',
          html: '<span class="solarmatch-map-marker" aria-hidden="true"></span>',
          iconSize: [34, 42],
          iconAnchor: [17, 40],
        });
        const markerLabel = english ? 'Home location marker' : 'หมุดตำแหน่งบ้าน';
        const marker = L.marker([latestLocation.current.latitude, latestLocation.current.longitude], {
          draggable: true,
          icon: markerIcon,
          title: markerLabel,
          alt: markerLabel,
        }).addTo(map);
        markerRef.current = marker;
        const updateLocation = (latitude: number, longitude: number, source: EstimateLocation['source'] = 'manual-map') => {
          const current = latestLocation.current;
          onChangeRef.current({
            ...current,
            latitude,
            longitude,
            province: inferProvinceFromCoordinates(latitude, longitude) === 'other' ? current.province : inferProvinceFromCoordinates(latitude, longitude),
            source,
            confirmed: false,
          });
        };
        marker.on('dragend', () => {
          const point = marker.getLatLng();
          updateLocation(point.lat, point.lng);
        });
        map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
          marker.setLatLng(event.latlng);
          updateLocation(event.latlng.lat, event.latlng.lng);
        });
        L.tileLayer(mapProvider.tileUrl, {
          attribution: mapProvider.attribution,
          maxZoom: 19,
          minZoom: 5,
          detectRetina: false,
        })
          .on('tileerror', () => {
            setTileFailed(true);
            setStatus(english ? 'Map tiles could not load. You can still use the position controls below.' : 'โหลดภาพแผนที่ไม่ได้ แต่ยังใช้ปุ่มปรับตำแหน่งด้านล่างได้');
          })
          .addTo(map);
        setStatus(english ? 'Tap the map, drag the marker, or use the buttons below.' : 'แตะแผนที่ ลากหมุด หรือใช้ปุ่มด้านล่างเพื่อปรับตำแหน่ง');
        requestAnimationFrame(() => map.invalidateSize());
      } catch {
        setTileFailed(true);
        setStatus(english ? 'The map could not start. Use the position controls or continue with the province fallback.' : 'เปิดแผนที่ไม่ได้ ใช้ปุ่มปรับตำแหน่งหรือดำเนินการต่อด้วยข้อมูลระดับจังหวัด');
      }
    }
    void initialise();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [english]);

  useEffect(() => {
    markerRef.current?.setLatLng([location.latitude, location.longitude]);
    if (location.source === 'current-location') mapRef.current?.setView([location.latitude, location.longitude], 18);
  }, [location.latitude, location.longitude, location.source]);

  function updatePosition(latitude: number, longitude: number) {
    const inferred = inferProvinceFromCoordinates(latitude, longitude);
    const next = {
      ...location,
      latitude,
      longitude,
      province: inferred === 'other' ? location.province : inferred,
      source: 'manual-map' as const,
      confirmed: false,
    };
    onChange(next);
    mapRef.current?.panTo([latitude, longitude]);
  }

  function moveToCentre() {
    const center = mapRef.current?.getCenter();
    if (center) updatePosition(center.lat, center.lng);
  }

  const nudge = 0.00025;
  return (
    <div className="address-map-shell">
      <div
        ref={containerRef}
        className={`address-map ${tileFailed ? 'address-map-failed' : ''}`}
        role="application"
        aria-label={english ? 'Map for confirming the approximate home location' : 'แผนที่สำหรับยืนยันตำแหน่งบ้านโดยประมาณ'}
      />
      <p className="map-status" role="status">{status}</p>
      <div className="map-position-controls" aria-label={english ? 'Marker position controls' : 'ปุ่มปรับตำแหน่งหมุด'}>
        <button type="button" onClick={() => updatePosition(location.latitude + nudge, location.longitude)} aria-label={english ? 'Move marker north' : 'เลื่อนหมุดไปทางเหนือ'}><MoveUp aria-hidden="true" /></button>
        <button type="button" onClick={() => updatePosition(location.latitude, location.longitude - nudge)} aria-label={english ? 'Move marker west' : 'เลื่อนหมุดไปทางตะวันตก'}><MoveLeft aria-hidden="true" /></button>
        <button type="button" className="map-centre-button" onClick={moveToCentre}><Crosshair aria-hidden="true" /> {english ? 'Put marker at map centre' : 'วางหมุดกลางแผนที่'}</button>
        <button type="button" onClick={() => updatePosition(location.latitude, location.longitude + nudge)} aria-label={english ? 'Move marker east' : 'เลื่อนหมุดไปทางตะวันออก'}><MoveRight aria-hidden="true" /></button>
        <button type="button" onClick={() => updatePosition(location.latitude - nudge, location.longitude)} aria-label={english ? 'Move marker south' : 'เลื่อนหมุดไปทางใต้'}><MoveDown aria-hidden="true" /></button>
      </div>
      <p className="map-coordinate-note"><LocateFixed aria-hidden="true" /> {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</p>
    </div>
  );
}

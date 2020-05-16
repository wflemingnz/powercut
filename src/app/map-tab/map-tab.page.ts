import { Component } from '@angular/core';
import { MapMarker } from '../models/map-marker';

@Component({
  selector: 'app-map-tab',
  templateUrl: './map-tab.page.html',
  styleUrls: ['./map-tab.page.scss'],
})
export class MapTabPage {
  latitude = 51.447359;
  longitude = -0.336917;
  zoom = 12;
  addMarkerMode = false;

  markers: MapMarker[] = [
    {
      latitude: 51.447468,
      longitude: -0.336917,
      label: 'A',
      info: '5 Albert Road',
    },
    {
      latitude: 51.457359,
      longitude: -0.346917,
      label: 'B',
      info: 'Isleworth',
    },
    {
      latitude: 51.444359,
      longitude: -0.356917,
      label: 'C',
      info: 'Chertsey Road',
    },
  ];

  get draggableCursor() {
    return this.addMarkerMode ? 'crosshair' : '';
  }

  addClicked() {
    this.addMarkerMode = !this.addMarkerMode;
  }

  mapClicked(event: MouseEvent) {
    if (this.addMarkerMode) {
      console.log(event);
    }
    this.addMarkerMode = false;
  }
}

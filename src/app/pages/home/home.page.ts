import { Component, ViewChild } from '@angular/core';
import { FirestoreService } from '../../services/firestore.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { Incident } from '../../models/incident';
import { GeolocationService } from '../../services/geolocation.service';
import { switchMap, map } from 'rxjs/operators';
import * as _ from 'lodash';
import * as moment from 'moment';
import { ModalController } from '@ionic/angular';
import { roundToWhole } from 'src/app/shared/utilities/round-to-whole';
import { transformBetweenRanges } from 'src/app/shared/utilities/transform-between-ranges';
import { IncidentViewModel } from 'src/app/models/incident-view-model';
import { IncidentAddedPage } from '../incident-added/incident-added.page';
import { PowerStatus } from 'src/app/types/power-status';
import { MapComponent } from './map/map.component';
import * as incidentConstants from '../../constants/incident-constants';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  geolocateZoom = 20;

  newIncidentDateTime: string;
  newIncidentStatus: PowerStatus;

  incidents$ = new Observable<IncidentViewModel[]>();

  activeIncidentIdSubject = new BehaviorSubject<string>(null);
  activeIncident$ = this.activeIncidentIdSubject.pipe(
    switchMap((id) =>
      this.incidents$.pipe(
        map((incidents) => incidents.find((i) => i.id === id))
      )
    )
  );

  showAddIncidentPopupSubject = new BehaviorSubject<boolean>(false);
  showAddIncidentPopup$ = this.showAddIncidentPopupSubject.pipe(
    map((showPopup) => (showPopup ? 'true' : 'false')) // use non-falsy strings for compatibility with *ngIf async
  );

  get geolocationAvailable() {
    return this.geolocationService.geolocationAvailable();
  }

  set activeIncidentId(id: string) {
    this.activeIncidentIdSubject.next(id);
  }

  @ViewChild(MapComponent) mapComponent: MapComponent;

  constructor(
    private fireStoreService: FirestoreService,
    private geolocationService: GeolocationService,
    public modalController: ModalController
  ) {
    this.incidents$ = this.fireStoreService
      .getRecentIncidents()
      .pipe(
        map((incidents) =>
          _.map(incidents, (incident) => this.createIncidentViewModel(incident))
        )
      );
  }

  createIncidentViewModel(incident: Incident): IncidentViewModel {
    const age = moment().diff(moment(incident.reportedAt), 'minutes'); // TODO change to hours or something else
    const iconFillColor = this.getIconFillColor(incident.status, age);
    return { ...incident, age, iconFillColor };
  }

  getIncidentType(status: PowerStatus): string {
    return incidentConstants.types[status];
  }

  getIconFillColor(status: PowerStatus, age: number) {
    const colorDef = incidentConstants.colorDefinitions[status];
    const lightness = this.getLightnessPercentBasedOnAge(
      age,
      colorDef.lightnessRange
    );
    return `hsl(${colorDef.hue}, ${colorDef.saturation}%, ${lightness}%)`;
  }

  getLightnessPercentBasedOnAge(
    age: number,
    range: { darkest: number; lightest: number }
  ) {
    const { darkest, lightest } = range;
    const lightness = transformBetweenRanges(
      age,
      { min: incidentConstants.minAge, max: incidentConstants.maxAge },
      { min: darkest, max: lightest }
    );
    return _.clamp(roundToWhole(lightness, 5), darkest, lightest);
  }

  async deleteClicked(incidents: IncidentViewModel[]) {
    await this.deleteAllIncidents(incidents);
  }

  onMapClicked() {
    this.clearActiveIncident();
  }

  onIncidentClicked(incident: IncidentViewModel) {
    this.activeIncidentId = incident.id;
  }

  showAddIncidentPopup() {
    this.showAddIncidentPopupSubject.next(true);
  }

  hideAddIncidentPopup() {
    this.showAddIncidentPopupSubject.next(false);
  }

  async addPopupAddClicked() {
    await this.presentIncidentAddedModal();
    const id = await this.fireStoreService.createIncident({
      status: this.newIncidentStatus,
      latitude: this.mapComponent.centerLatitude,
      longitude: this.mapComponent.centerLongitude,
      reportedAt: this.newIncidentDateTime,
    });
    this.hideAddIncidentPopup();
    this.mapComponent.centerIndicatorVisible = false;
  }

  addPopupCancelClicked() {
    this.hideAddIncidentPopup();
  }

  async activePopupDeleteClicked(id: string) {
    await this.fireStoreService.deleteIncident(id);
  }

  activePopupCloseClicked() {
    this.clearActiveIncident();
  }

  clearActiveIncident() {
    this.activeIncidentId = null;
  }

  async deleteAllIncidents(incidents: IncidentViewModel[]) {
    this.clearActiveIncident();

    const deletions = incidents.map((incident) =>
      this.fireStoreService.deleteIncident(incident.id)
    );
    await Promise.all(deletions);
  }

  async onAddIncidentClicked(status: PowerStatus) {
    this.clearActiveIncident();
    this.newIncidentDateTime = new Date().toISOString();
    this.newIncidentStatus = status;
    this.showAddIncidentPopup();
  }

  async presentIncidentAddedModal() {
    const modal = await this.modalController.create({
      component: IncidentAddedPage,
      swipeToClose: true,
      cssClass: 'modal-partial-screen',
      // componentProps: { incident: this.activeIncident$ },
    });
    return await modal.present();
  }

  async geolocationClicked() {
    if (this.geolocationService.geolocationAvailable()) {
      const coords = await this.geolocationService.getUserLocation();
      this.mapComponent.animateTo(coords, this.geolocateZoom);
    }
  }
}

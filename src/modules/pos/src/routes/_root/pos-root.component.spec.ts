import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {PebPosComponent} from './pos-root.component';
import {PanelConnectComponent} from '../connect/panels/connect.component';

describe('AppComponent', () => {
  let component: PanelConnectComponent;
  let fixture: ComponentFixture<PanelConnectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PebPosComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    component = fixture.componentInstance;
    fixture = TestBed.createComponent(PanelConnectComponent);
    fixture.detectChanges();
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});

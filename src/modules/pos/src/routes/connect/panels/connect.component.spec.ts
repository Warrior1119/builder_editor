import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {Router} from '@angular/router';
import { Location } from '@angular/common';

import {PanelConnectComponent} from './connect.component';
import {MicroLoaderService} from '../services/micro.service';

describe('PanelConnectComponent', () => {
  let component: PanelConnectComponent;
  let fixture: ComponentFixture<PanelConnectComponent>;
  let router: Router;
  let microService;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      // provide the component-under-test and dependent service
      providers: [ PanelConnectComponent,
        { provide: MicroLoaderService }],
    })
      .compileComponents();
  }));
  microService = TestBed.inject(MicroLoaderService);

  beforeEach(() => {
    fixture = TestBed.createComponent(PanelConnectComponent);
    router.initialNavigation();
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  router = TestBed.get(Router);
  location = TestBed.get(Location);

  it('should create component', () => {
    expect(component).toBeDefined();
  });
  // observable function with timer
  it('#preloadConnectMicro should return value from observable',
    fakeAsync((done: DoneFn) => {
      fixture.detectChanges();
      microService.preloadConnectMicro().subscribe(value => {
        expect(value).toBe('connect');
        tick(500);
        done();
      });
  }));

  /*
  * COMPONENT BEFORE REDIRECTING
  * */
  it('should redirect you to /business',
    async((integration) => {
      // The type annotation can be left out as it's inferred from `TestBed.inject`
      const location: Location = TestBed.inject(Location);
      router.navigate(['add']);
      expect(location.path()).toBe(`business/${this.envService.businessId}/pos/connect`);
  }));

  it('navigate to "" redirects you to /integration', fakeAsync((integration) => {
    // The type annotation can be left out as it's inferred from `TestBed.inject`
    const location: Location = TestBed.inject(Location);
    router.navigate(['qr']);
    tick();
    expect(location.path()).toBe(`integration/${integration.integration.name}`);
  }));
});

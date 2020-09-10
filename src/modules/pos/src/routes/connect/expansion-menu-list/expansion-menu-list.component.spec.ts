import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ExpansionMenuListComponent} from './expansion-menu-list.component';


describe('ExpansionMenuListComponent', () => {
  let component: ExpansionMenuListComponent;
  let fixture: ComponentFixture<ExpansionMenuListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExpansionMenuListComponent ],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpansionMenuListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should emit on click clickedIntegrationButton', () => {
    // spy on event emitter
    spyOn(component.clickedIntegrationButton, 'emit');

    // trigger the click
    const nativeElement = fixture.nativeElement;
    const button = nativeElement.querySelector('button');
    button.dispatchEvent(new Event('click'));

    fixture.detectChanges();
    // element emit
    expect(component.clickedIntegrationButton.emit).toHaveBeenCalledWith('integration');
  });

  it('should emit on click clickedToggleButton', () => {
    // spy on event emitter
    spyOn(component.clickedToggleButton, 'emit');

    // trigger the click
    const nativeElement = fixture.nativeElement;
    const button = nativeElement.querySelector('button');
    button.dispatchEvent(new Event('click'));

    fixture.detectChanges();
    // element emit
    expect(component.clickedToggleButton.emit).toHaveBeenCalledWith('integration');
  });
});

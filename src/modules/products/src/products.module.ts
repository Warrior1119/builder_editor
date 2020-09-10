import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';

import { PeDataGridModule } from '@pe/data-grid';

import { PebProductsComponent } from './products.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatMenuModule,
    PeDataGridModule,
  ],
  declarations: [
    PebProductsComponent,
  ],
  exports: [
    PebProductsComponent,
  ],
})
export class PebProductsModule {}

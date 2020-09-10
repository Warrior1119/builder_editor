import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AbbreviationPipe } from './misc/pipes/abbreviation.pipe';
import { PebTerminalCreateComponent } from './routes/create/terminal-create.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
  ],
  declarations: [
    PebTerminalCreateComponent,
    AbbreviationPipe,
  ],
  exports: [
    AbbreviationPipe,
    PebTerminalCreateComponent,
  ],
})
export class PebPosSharedModule {}

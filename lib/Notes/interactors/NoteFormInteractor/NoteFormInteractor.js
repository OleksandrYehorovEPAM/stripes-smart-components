import {
  interactor,
  isPresent,
  fillable,
  clickable,
  value,
  is,
  blurrable,
  selectable,
} from '@bigtest/interactor';

@interactor class Select {
  selectOption = selectable();
  value = value();

  selectAndBlur(val) {
    return this
      .selectOption(val)
      .blur();
  }
}

@interactor class Button {
  isDisabled = is('[disabled]');
  click = clickable();
}

@interactor class FormField {
  enterText(text) {
    return this
      .fill(text)
      .blur();
  }

  blur = blurrable();
  fill = fillable();
  value = value();
}

@interactor class NoteForm {
  closeButton = new Button('[data-test-leave-note-form]');
  saveButton = new Button('[data-test-save-note]');

  noteTypesSelect = new Select('[data-test-note-types-field]');
  noteTitleField = new FormField('[data-test-note-title-field]');

  hasTitleLengthError = isPresent('[data-test-character-limit-error="title"]');
  hasTitleMissingError = isPresent('[data-test-title-missing-error]');
  navigationModalIsOpened = isPresent('#navigation-modal');

  clickCancelNavigationButton = clickable('[data-test-navigation-modal-dismiss]');
  clickContinueNavigationButton = clickable('[data-test-navigation-modal-continue]');
}

export default NoteForm;

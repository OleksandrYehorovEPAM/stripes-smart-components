import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import {
  get,
  debounce,
} from 'lodash';

import {
  Modal,
  Paneset,
  Pane,
  MultiColumnList,
  Button,
  SearchField,
  Checkbox,
  Accordion,
  Headline,
  IconButton,
} from '@folio/stripes-components';

import {
  SearchAndSortResetButton as ResetButton,
  CheckboxFilter,
} from '../../../../../..';

import {
  notesStatuses,
  sortOrders,
  NOTE_LINKS_MIN_NUMBER,
} from '../../../../constants';

import {
  columnNames,
  columnWidths,
} from './constants';

import styles from './NotesAssigningModal.css';

const {
  ASSIGNED,
  UNASSIGNED,
} = notesStatuses;

const {
  ASC,
  DESC,
} = sortOrders;

const {
  ASSIGNING,
  TITLE,
  STATUS,
} = columnNames;

const notesStatusOptions = [
  {
    label: <FormattedMessage id="stripes-smart-components.assigned" />,
    value: ASSIGNED,
  },
  {
    label: <FormattedMessage id="stripes-smart-components.unassigned" />,
    value: UNASSIGNED,
  },
];

const noteShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  linksNumber: PropTypes.number.isRequired,
  status: PropTypes.oneOf([ASSIGNED, UNASSIGNED]),
  title: PropTypes.node.isRequired,
});

const notesShape = PropTypes.shape({
  items: PropTypes.arrayOf(noteShape),
  loading: PropTypes.bool,
  sortParams: PropTypes.shape({
    by: PropTypes.string,
    order: PropTypes.oneOf([ASC, DESC]),
  }),
  totalCount: PropTypes.number,
});

const DEBOUNCE_TIME_FOR_SETTING_QUERY = 200;

export default class NotesAssigningModal extends React.Component {
  static propTypes = {
    fetchDomainNotes: PropTypes.func.isRequired,
    notes: notesShape,
    onClose: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onSearch: PropTypes.func.isRequired,
    onSort: PropTypes.func.isRequired,
    open: PropTypes.bool,
  };

  static defaultProps = {
    notes: {
      totalCount: 0,
      items: [],
      sortParams: {
        order: ASC,
        by: TITLE,
      },
      loading: false,
    },
    open: false,
  };

  state = {
    selectedStatusFilters: [],
    query: '',
    changedNoteIdToStatusMap: new Map(),
  };

  firstColumnHeaderFormatter = {
    [ASSIGNING]: (note) => {
      const isAssigned = note.status === ASSIGNED;
      const isDisabled = isAssigned && this.getNoteLinksNumber(note) === NOTE_LINKS_MIN_NUMBER;

      return (
        <Checkbox
          role="button"
          disabled={isDisabled}
          checked={isAssigned}
          className={styles['assign-checkbox']}
          onClick={() => this.onSingleAssignClick(note)}
        />
      );
    },
  };

  getNoteLinksNumber(note) {
    const newStatus = this.state.changedNoteIdToStatusMap.get(note.id);
    return newStatus === ASSIGNED ? note.linksNumber + 1 : note.linksNumber;
  }

  onSingleAssignClick = (note) => {
    this.setState((state, props) => {
      return {
        changedNoteIdToStatusMap: this.getNewChangedNoteIdToStatusMap(state, note, props.notes.items),
      };
    });
  };

  getNewChangedNoteIdToStatusMap = (state, note, notes) => {
    const { changedNoteIdToStatusMap } = state;

    const incomingNoteStatus = notes.find((curNote) => curNote.id === note.id).status;
    const newStatus = note.status === ASSIGNED ? UNASSIGNED : ASSIGNED;
    const newChangedNoteIdToStatusMap = new Map(changedNoteIdToStatusMap);

    if (incomingNoteStatus === newStatus) {
      newChangedNoteIdToStatusMap.delete(note.id);
    } else {
      newChangedNoteIdToStatusMap.set(note.id, newStatus);
    }

    return newChangedNoteIdToStatusMap;
  };

  onStatusFilterChange = (filter) => {
    this.setState(
      { selectedStatusFilters: [...filter.values] },
      this.search
    );
  };

  getNotes = () => {
    const { changedNoteIdToStatusMap } = this.state;

    return this.props.notes.items.map((curNote) => {
      return changedNoteIdToStatusMap.has(curNote.id)
        ? { ...curNote, status: changedNoteIdToStatusMap.get(curNote.id) }
        : curNote;
    });
  };

  renderFooter() {
    return (
      <Fragment>
        <Button onClick={this.props.onClose}>
          <FormattedMessage id="stripes-core.button.cancel" />
        </Button>
        <Button
          onClick={this.onSaveAndClose}
          buttonClass={styles['save-button']}
        >
          <FormattedMessage id="stripes-core.button.save" />
        </Button>
      </Fragment>
    );
  }

  onSaveAndClose = () => {
    this.props.onSave(this.state.changedNoteIdToStatusMap);
  }

  search = () => {
    const {
      query,
      selectedStatusFilters,
    } = this.state;

    this.setState(
      { changedNoteIdToStatusMap: new Map() },
      this.props.onSearch({
        query,
        selectedStatusFilters,
      })
    );
  }

  onSearchQueryChange = (event) => {
    const { value } = event.target;
    this.updateQuery(value);
  }

  updateQuery = debounce((value) => {
    this.setState({ query: value });
  }, DEBOUNCE_TIME_FOR_SETTING_QUERY);

  onResetAll = () => {
    this.setState({
      query: '',
      selectedStatusFilters: [],
    }, this.props.onReset);
  }

  onColumnHeaderClick = (event, column) => {
    if (column.name === ASSIGNING) return;
    const {
      query,
      selectedStatusFilters,
    } = this.state;

    this.props.onSort({
      sortParams: this.getSortParams(column.name),
      query,
      selectedStatusFilters,
    });
  }

  getSortParams = (columnName) => {
    const {
      notes: { sortParams }
    } = this.props;
    const columnIsChanged = columnName !== sortParams.by;

    const sortOrder = columnIsChanged
      ? ASC
      : sortParams.order === ASC ? DESC : ASC;

    return {
      order: sortOrder,
      by: columnName,
    };
  };


  getColumnMapping = () => {
    return {
      [ASSIGNING]: (
        <Checkbox
          role="button"
          name={ASSIGNING}
          checked={this.isEveryNoteAssigned()}
          className={styles['assign-checkbox']}
          onClick={this.onAssignAllClick}
        />
      ),
      title: <FormattedMessage id="stripes-smart-components.title" />,
      status: <FormattedMessage id="stripes-smart-components.status" />,
    };
  }

  isEveryNoteAssigned() {
    const { notes } = this.props;
    const incomingAssignedNotes = notes.items.filter((note) => note.status === ASSIGNED);

    let potentialAssignedNotesCount = 0;

    for (const potentialStatus of this.state.changedNoteIdToStatusMap.values()) {
      if (potentialStatus === ASSIGNED) {
        potentialAssignedNotesCount++;
      }
    }

    return incomingAssignedNotes.length + potentialAssignedNotesCount === notes.items.length;
  }

  onAssignAllClick = (event) => {
    const { checked } = event.target;

    this.setState((state) => {
      const newStatus = checked ? ASSIGNED : UNASSIGNED;
      const newChangedNoteIdToStatusMap = new Map(state.changedNoteIdToStatusMap);

      this.props.notes.items.forEach((curIncomingNote) => {
        if (curIncomingNote.status !== newStatus) {
          if (newStatus === UNASSIGNED && this.getNoteLinksNumber(curIncomingNote) === NOTE_LINKS_MIN_NUMBER) {
            return;
          }
          newChangedNoteIdToStatusMap.set(curIncomingNote.id, newStatus);
        } else {
          newChangedNoteIdToStatusMap.delete(curIncomingNote.id);
        }
      });

      return {
        changedNoteIdToStatusMap: newChangedNoteIdToStatusMap,
      };
    });
  }

  renderResetFiltersButton() {
    return (
      <IconButton
        size="small"
        iconSize="small"
        icon="times-circle-solid"
        onClick={this.onFiltersReset}
      />
    );
  }

  onFiltersReset = () => {
    this.setState({
      selectedStatusFilters: [],
    });

    this.props.onSearch({
      assignmentStatuses: [],
    });
  }

  fetchNotes = () => {
    const {
      query,
      selectedStatusFilters
    } = this.state;

    const {
      fetchDomainNotes,
      notes,
    } = this.props;

    const offset = get(this.props, 'notes.items.length');

    if (offset === notes.totalCount) {
      return;
    }

    fetchDomainNotes({
      offset,
      query,
      selectedStatusFilters,
    });
  }

  render() {
    const {
      open,
      notes,
      onClose,
    } = this.props;

    const {
      query,
      selectedStatusFilters,
    } = this.state;

    const queryIsEmpty = query.length === 0;
    const statusFiltersAreEmpty = selectedStatusFilters.length === 0;
    const searchOptionsIsEmpty = queryIsEmpty && statusFiltersAreEmpty;
    const thereAreSelectedFilters = selectedStatusFilters.length > 0;

    return (
      <Modal
        size="large"
        open={open}
        label={<FormattedMessage id="stripes-smart-components.notes.assignNote" />}
        onClose={onClose}
        footer={this.renderFooter()}
        dismissible
      >
        <Paneset id="notes-modal-paneset" static>
          <Pane
            defaultWidth="30%"
            paneTitle={<FormattedMessage id="stripes-smart-components.searchAndFilter" />}
          >
            <SearchField
              aria-label={<FormattedMessage id="stripes-smart-components.notes.noteSearch" />}
              name="query"
              onChange={this.onSearchQueryChange}
              value={query}
              marginBottom0
              autoFocus
              className={styles['search-field']}
            />
            <Button
              type="submit"
              buttonStyle="primary"
              fullWidth
              disabled={queryIsEmpty}
              onClick={this.search}
            >
              <FormattedMessage id="stripes-smart-components.search" />
            </Button>
            <div>
              <ResetButton
                label={<FormattedMessage id="stripes-smart-components.resetAll" />}
                disabled={searchOptionsIsEmpty}
                onClick={this.onResetAll}
              />
            </div>

            <Accordion
              id="notes-status"
              closedByDefault={false}
              label={
                <Headline size="large" tag="h3">
                  <FormattedMessage id="stripes-smart-components.notes.noteAssignmentStatus" />
                </Headline>
              }
              displayWhenOpen={thereAreSelectedFilters && this.renderResetFiltersButton()}
            >
              <CheckboxFilter
                dataOptions={notesStatusOptions}
                name="notesStatus"
                selectedValues={selectedStatusFilters}
                onChange={this.onStatusFilterChange}
              />
            </Accordion>
          </Pane>
          <Pane
            paneTitle={<FormattedMessage id="stripes-smart-components.notes" />}
            paneSub={(
              <FormattedMessage
                id="stripes-smart-components.notes.found"
                values={{ quantity: notes.totalCount || 0 }}
              />
            )}
            defaultWidth="70%"
          >
            <MultiColumnList
              visibleColumns={[ASSIGNING, TITLE, STATUS]}
              contentData={this.getNotes()}
              totalCount={notes.totalCount}
              columnMapping={this.getColumnMapping()}
              columnWidths={columnWidths}
              onHeaderClick={this.onColumnHeaderClick}
              sortOrder={notes.sortParams.by}
              sortDirection={notes.sortParams.order}
              isEmptyMessage={<FormattedMessage id="stripes-smart-components.notes.notFound" />}
              formatter={this.firstColumnHeaderFormatter}
              virtualize
              onNeedMoreData={this.fetchNotes}
              loading={notes.loading}
              height={220}
            />
          </Pane>
        </Paneset>
      </Modal>
    );
  }
}

import _ from 'lodash';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import ReactPaginate from 'react-paginate';
import { Table, Icon, Sticky, Header, Button, Segment } from 'semantic-ui-react';
import styles from '../styles/pages/FileLoader.scss';
import paginationStyles from '../styles/components/Pagination.scss';
import FileRow from '../components/FileRow';
import DismissibleMessage from '../components/common/DismissibleMessage';
import PageHeader from '../components/common/PageHeader';
import FolderBrowser from '../components/common/FolderBrowser';
import { loadRootFolder, changeFolderSelection, storeScrollPosition, playFile } from '../actions/fileLoader';
import { displayError, dismissError } from '../actions/error';
import { gameProfileLoad } from '../actions/game';


class FileLoader extends Component {
  
  props: {
    // fileLoader actions
    loadRootFolder: () => void,
    changeFolderSelection: (path) => void,
    playFile: (file) => void,
    storeScrollPosition: () => void,

    // game actions
    gameProfileLoad: (game) => void,

    // error actions
    dismissError: (key) => void,

    // store data
    history: object,
    store: object,
    errors: object,
  };

  refPrimary: {};
  constructor(props) {
    super(props);
    this.state = {
      totalPages: 0,
      initialPage: 0,
      totalPerPage: 10,
    };
  }
  componentDidMount() {
    const xPos = _.get(this.props.store, ['scrollPosition', 'x']) || 0;
    const yPos = _.get(this.props.store, ['scrollPosition', 'y']) || 0;
    window.scrollTo(xPos, yPos);
    this.props.loadRootFolder();
  }

  componentWillReceiveProps(nextProps){
    const { store } = nextProps;
    const { totalPerPage } = this.state;
    this.setState({
      totalPages: store.files.length / totalPerPage,
    });
  }
  componentWillUnmount() {
    this.props.storeScrollPosition({
      x: window.scrollX,
      y: window.scrollY,
    });


    // TODO: I added this because switching to the stats view was maintaining the scroll
    // TODO: position of this component
    // TODO: Might be better to do something as shown here:
    // TODO: https://github.com/ReactTraining/react-router/issues/2144#issuecomment-150939358
    window.scrollTo(0, 0);
    this.props.dismissError('fileLoader-global');
  }

  setRefPrimary = element => {
    this.refPrimary = element;
  };

  renderSidebar() {
    const refPrimary = this.refPrimary;
    const store = this.props.store || {};

    return (
      <Sticky context={refPrimary}>
        <div className={styles['sidebar']}>
          <FolderBrowser
            folders={store.folders}
            rootFolderName={store.rootFolderName}
            selectedFolderFullPath={store.selectedFolderFullPath}
            changeFolderSelection={this.props.changeFolderSelection}
          />
        </div>
      </Sticky>
    );
  }

  renderGlobalError() {
    const errors = this.props.errors || {};
    const errorKey = 'fileLoader-global';

    const showGlobalError = errors.displayFlags[errorKey] || false;
    const globalErrorMessage = errors.messages[errorKey] || "";
    return (
      <DismissibleMessage
        error={true}
        visible={showGlobalError}
        icon="warning circle"
        header="An error has occurred"
        content={globalErrorMessage}
        onDismiss={this.props.dismissError}
        dismissParams={[errorKey]}
      />
    );
  }

  renderEmptyLoader() {
    const folders = this.props.store.folders || {};
    const rootFolderName = this.props.store.rootFolderName || '';

    if (!folders[rootFolderName]) {
      return this.renderMissingRootFolder();
    }

    return (
      <div className={styles['empty-loader-content']}>
        <Header as="h2" icon={true} color="grey" inverted={true} textAlign="center">
          <Icon name="search" />
          <Header.Content>
            No Replay Files Found
            <Header.Subheader>
              Place slp files in the folder to browse
            </Header.Subheader>
          </Header.Content>
        </Header>
      </div>
    );
  }

  renderMissingRootFolder() {
    return (
      <div className={styles['empty-loader-content']}>
        <Header as="h2" icon={true} color="grey" inverted={true} textAlign="center">
          <Icon name="folder outline" />
          <Header.Content>
            Root Folder Missing
            <Header.Subheader>
              Go to the settings page to select a root slp folder
            </Header.Subheader>
          </Header.Content>
        </Header>
        <Segment basic={true} textAlign="center">
          <Link to="/settings">
            <Button color="blue" size="large">
              Select Folder
            </Button>
          </Link>
        </Segment>
      </div>
    );
  }

  renderFileSelection() {
    const store = this.props.store || {};
    let files = store.files || [];

    // Filter out files that were shorter than 30 seconds
    files = files.filter(file => {
      const settings = file.game.getSettings() || {};
      if (!settings.stageId) {
        // I know that right now if you play games from debug mode it make some
        // weird replay files... this should filter those out
        return false;
      }

      const metadata = file.game.getMetadata() || {};
      const totalFrames = metadata.lastFrame || (30 * 60) + 1;
      return totalFrames > (30 * 60);
    });

    // If we have no files to display, render an empty state
    if (!files.length) {
      return this.renderEmptyLoader();
    }

    // Generate header row
    const headerRow = (
      <Table.Row>
        <Table.HeaderCell />
        <Table.HeaderCell>File</Table.HeaderCell>
        <Table.HeaderCell>Characters</Table.HeaderCell>
        <Table.HeaderCell>Stage</Table.HeaderCell>
        <Table.HeaderCell>Time</Table.HeaderCell>
        <Table.HeaderCell />
      </Table.Row>
    );

    // Generate a row for every file in selected folder
    const rows = files.map(file => (
      <FileRow
        key={file.fullPath}
        file={file}
        playFile={this.props.playFile}
        gameProfileLoad={this.props.gameProfileLoad}
      />
    ), this);

    return (
      <Table
        className={styles['file-table']}
        basic="very"
        celled={true}
        inverted={true}
        selectable={true}
      >
        <Table.Header>
          {headerRow}
        </Table.Header>
        <Table.Body>
          {rows}
        </Table.Body>
      </Table>
    );
  }
  renderSearchBar() {
    return (
      <input placeholder='Search for a file' />
    );
  }
  renderPagination() {
    const { totalPages, initialPage } = this.state;
    return (
      <ReactPaginate
        pageCount={totalPages}
        initialPage={initialPage}
        previousLabel={'<'}
        nextLabel={'>'}
        containerClassName={paginationStyles['pagination__container']}
        pageLinkClassName={paginationStyles['pagination__page--link']}
        pageClassName={paginationStyles['pagination__page--page']}
      />
    );
  }
  renderMain() {
    return (
      <div className="main-padding">
        <PageHeader icon="disk outline" text="Replay Browser" history={this.props.history} />
        {this.renderGlobalError()}
        {this.renderFileSelection()}
        {this.renderPagination()}
      </div>
    );
  }

  render() {
    return (
      <div ref={this.setRefPrimary} className={styles['layout']}>
        {this.renderSidebar()}
        {this.renderMain()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    store: state.fileLoader,
    errors: state.errors,
  };
}

export default connect(mapStateToProps, {
  loadRootFolder,
  changeFolderSelection,
  storeScrollPosition,
  playFile,
  displayError,
  dismissError,
  gameProfileLoad,
})(FileLoader);


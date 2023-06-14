import type { Content } from './cn';

export const content: Content = {
  sidebar: {
    listMode: 'List Mode',
    gridMode: 'Grid Mode',
    joinGroup: 'Join SeedNet',
    createGroup: 'Create SeedNet',
    showHideSeednet: 'Show/Hide Seednet',
    noSeedNetSearchResult: 'No SeedNets matching found',
    noTypeGroups: 'There is no SeedNet of this type',
    recentTip: 'Recently Reading',
    recentOpen: 'Recently Opened',
    recentAdd: 'Recently Added',
  },
  welcome: {
    welcomeToUseRum: 'Welcome to Rumbrary',
    youCanTry: 'You can try',
    joinGroup: 'Add existing seed',
    createGroup: 'Create SeedNet',
  },
  group: {
    groupName: 'SeedNet name',
    desc: 'Description',
    seedNet: 'SeedNet',
    trxInfo: 'Trx Details',
    exit: 'Exit',
    name: 'Name',
    owner: 'Owner',
    auth: 'Permission',
    groupInfo: 'SeedNet details',
    idle: 'Idle',
    syncing: 'Syncing',
    synced: 'Synced',
    syncFailed: 'Sync failed',
    manageGroup: 'Edit SeedNet',
    exitGroup: 'Exit',
    confirmToExit: 'Are you sure to exit this SeedNet ? ',
    exited: 'Exited',
    exitingGroup: 'Exiting Group',
    share: 'Share',
    highestBlockId: 'Latest block',
    highestHeight: 'Number of blocks',
    lastUpdated: 'Last Updated',
    status: 'Status',
    syncingContentTip: 'Checking and synchronizing the latest posts in the SeedNet , please wait patiently',
    clickToSync: 'Click to synchronize the latest content',
    linkGroup: 'Link Comment Seednet',
    unLinkGroup: 'Unlink Comment Seednet',
  },
  linkGroup: {
    linked: 'Seednet Linked',
    linkGroup: 'Link Commnet Seednet',
    selectFromExistedSeednet: 'Select a Seednet',
    seednetSelectPlaceholder: 'Select a Seednet',
    noSeednet: 'No Seednet',
    createSeednet: 'Create Seednet',
    joinSeednet: 'Join Seednet',
    link: 'Link',
    noChapter: 'No Chapter',
    postInputPlaceholder: 'What\'s happning',
    publish: 'Publish',
    replyPlaceHolder: 'Type something',
    commentPlaceHolder: 'Type your comment...',
    reply: 'Reply',
    editProfile: 'Edit Profile',
    noPostYet: 'No Post yet, go publish one',
    bookNotFound: 'Book cannot be found',
    replyTo: 'reply to',
    unlinkTip: 'Unlink the comment seetnet? (would not leave the seednet)',
    unlinked: 'Unlined',
    notLinkedSeednet: 'Unlinked Seednet',
    like: 'Like',
    comment: 'Comment',
    noCommentSeednetLinked: 'No comment seednet was link to current seetnet',
    goLink: 'go link',
    openInDetail: 'Open in Detail',
    postNotFound: 'Post cannot be found',
    latest: 'Latest',
    hot: 'Hot',
    emptyPostTip: 'post cannot be empty',
    writePost: 'Post Thoughts',
    deletePostTip: 'Confirm to Delete this Post?',
    delete: 'Delete',
    deleted: 'Deleted',
    selectBook: 'Change Book',
    marked: 'marked this',
    empty: 'empty',
  },
  notification: {
    comment: 'Comment your post',
    commentLike: 'Liked your comment',
    commentReply: 'Reply your comment',
    postLike: 'Liked your post',
    clickToView: 'Open',
  },
  epub: {
    setAsPublic: 'Set As Public',
    bookDetail: 'Book Detail',
    noDescription: 'No description',
    noCover: 'No book-cover',
    editCover: 'Edit Book-cover',
    editMetadata: 'Edit Metadata',
    translatorTag: '(translator)',
    continueReading: 'Read From Lastime',
    startReading: 'Read',
    toggleFullscreen: 'Full Screen',
    prevChapter: 'Prev. Chapter',
    nextChapter: 'Next Chapteer',
    backToPrevPos: 'Back to Prev. Location',
    chapterSelect: 'Chapters',
    toc: 'Table of Contents',
    noChapter: 'No Chapter',
    changeBook: 'Book Select',
    noBook: 'No Book',
    uploadedAt: (time: string) => `Uploaded at ${time}`,
    currentReading: 'Current Reading',
    books: (n: number) => `${n} books`,
  },
  epubSettings: {
    displaySetting: 'Display',
    fontSize: 'Font Size',
    default: 'Default',
    lineHeight: 'Line Spacing',
    theme: 'Theme',
    light: 'Light Mode',
    dark: 'Dark Mode',
    black: 'Black',
    font: 'Font',
    serif: 'Serif',
    sansSerif: 'Sans-serif',
    custom: 'Customize',
    customFontTip: 'Input the font name you want to use, like Arial, Times New Roman, etc.',
  },
  epubShortCut: {
    shortCut: 'Shortcuts',
    enterFullscreen: 'Full Screen',
    exitFullscreen: 'Exit Full Screen',
    prevPage: 'Prev. Page',
    nextPage: 'Next Page',
    prevChapter: 'Prev. Chapter',
    nextChapter: 'Next Chapter',
    toggleToc: 'Toggle TOC',
    toggleHighlighs: 'Toggle Highlights',
    backToPrevPos: 'Back to Prev. Location',
  },
  epubHighlights: {
    all: 'All Highlights',
    title: 'Highlight List',
    search: 'Search',
    noSearchItem: 'No Search Results',
    noItem: 'No highlights',
    confirmDelete: 'Are you sure to delete this highlight?',
    mark: 'Mark',
    marked: 'Marked',
    noPostsYet: 'No Post Yet',
  },
  epubMetadata: {
    subTitle: 'Sub Title:',
    isbn: 'ISBN:',
    author: 'Author:',
    translator: 'Translator:',
    publishDate: 'Publish Date:',
    publisher: 'Pulbisher:',
    languages: 'Language:',
    languageWithIndex: (index?: React.ReactNode) => `Language ${index}：`,
    series: 'Series:',
    seriesNumber: 'Series Number:',
    categoryLevel: 'Category:',
    wordCount: 'Word Count:',
    rating: 'Rate:',
    tags: 'Tags:',
    tagsNoColon: 'Tag',
    description: 'Description:',
    descriptionNoColon: 'Description',
    closeConfirm: 'Unsaved changes will be lost, are you sure to close?',
    submitFailed: 'Failed to submit!',
    submitted: 'Metadatas have been saved, uploading to the blockchain.',
    editMetadata: 'Edit Metadata',
    isbnTip: 'ISBN is not required, but can improve search result. ISBN can NOT be changed once submitted.',
    autherTip: 'Use \'&\' to seperate authors names.Use parenthesis to mention nationality, for example:\'(France)\'',
    authorInsertSeperator: 'Insert ･',
    traslatorTip: 'Use \'&\' to seperate translators names.',
    addLanguage: (i: 2 | 3) => `Add ${i === 2 ? 'second' : ''}${i === 3 ? 'third' : ''} language`,
    seriesTip: 'The book belongs to the series.',
    seriesNumberTip: 'Number 1 to 100',
    categoryLevel1: 'Category Level 1',
    categoryLevel2: 'Category Level 2',
    categoryLevel3: 'Category Level 3',
    submitChanges: 'Submit',
  },
  epubGroupView: {
    noBookUploadTip: [
      'No book in the SeedNet',
      'Click on the Upload button above to upload book.',
    ],
    noBookWaitTip: [
      'No book in the SeedNet',
      'Waiting for uploading/syncing.',
    ],
    uploadingTip: [
      'Book is uploading...',
      'You will see the book here and begin to read after uploading successed.',
    ],
    uploadedTip: 'Uploading Successed',
    startReading: 'Begin to Read',
  },
  epubUpload: {
    uploadBook: 'Upload Book',
    uploadBookNoPermission: 'You are not permitted to upload to this SeedNet.',
    readFailed: 'File reading error',
    parseFailed: 'Failed to parse file',
    alreadyUploaded: (name: React.ReactNode) => ['The book', name, 'has been uploaded once, do you want to upload again?'],
    uploadEpub: 'Upload Epub File',
    uploadToSeedNet: (name: string) => `Upload to SeedNet "${name}"`,
    dragEpubHere: 'Drag Epub File Here',
    or: 'Or',
    selectEpubFile: 'Select Locale Epub File',
    selected: 'Selected:',
    uploadSuccess: 'Uploading Successed',
    uploadMore: '继续上传',
    confirmUpload: 'Confirm to Upload',
  },
  epubCover: {
    readFailed: 'File reading error',
    editCover: 'Edit Book-cover',
    currentCover: 'Current Book-cover',
    dragCoverHere: 'Drag Image Here',
    supportFileTip: 'Supporting \'.jpg\' and \'.png\' files under size of 2 M.',
    uploadSuccess: 'Uploading Successed!',
    or: 'or',
    selectCoverFile: 'Select Locale Image File',
    fixedRatio: 'Fixed Ratio',
    cancelSelect: 'Cancel',
    confirmCrop: 'Crop',
    reCrop: 'reCrop',
    uploading: 'Uploading...',
    confirmUpload: 'Confirm to Upload',
  },
  createGroup: {
    createGroup: 'Create SeedNet',
    selectTemplate: '选择内容类型',
    selectTemplateTip: '目前只支持epub格式，不久的将来 Rum 会支持更多内容及格式类型。',
    linkGroupTemplateTip: 'Create a linked seednet for publishing comments',
    NA: '未开放',
    book: '书籍',
    linkGroup: '书籍评论',
    permissionTitle: '发布类种子网络 - 成员权限设置',
    permissionTip: '设置新成员加入后的内容发布权限。*种子网络建立后，无法修改默认权限',
    write: '新成员默认可写',
    comment: '新成员仅可评论',
    readonly: '新成员默认只读',
    writeDesc: [
      '',
      '',
    ],
    commentDesc: [
      '',
      '',
    ],
    readonlyDesc1: (tooltip: React.ReactNode) => [
      '',
      tooltip,
      '',
    ],
    readonlyDesc2: '',
    readonlyTip: '',
    groupBasicInfo: 'Epub SeedNet - Basic Info.',
    name: 'Name (Can not be changed after SeedNet created)',
    desc: 'About (Can be left blank)',
    confirmCreateEpubSeednet: 'Confirm to create Epub SeedNet',
    confirmCreateEpubLinkSeednet: 'Confirm to create Epub Link SeedNet',
    confirmCreateTip: 'Once created, you can not chage the name and the template you choose.',
    backAndEdit: 'Think again',
    confirmCreate: 'Confirm',
    confirmCreateAndUpload: 'Confirm',
    created: 'SeedNet successfully created',
  },
  joinGroup: {
    joinGroup: 'Add existing seed',
    seedParsingError: 'Parsing seed failed',
    existMember: 'You are already a member of this SeedNet ',
    pasteSeedText: 'Paste seed text',
    selectSeedFile: 'Select seed file',
    selectedSeedFile: 'Seed file is selected',
    selectSeedToJoin: 'Select the seed file to join the SeedNet',
    availablePublicGroups: 'Available public SeedNets for joining? ',
  },
  titleBar: {
    about: 'About Rumbrary',
    checkForUpdate: 'Update',
    manual: 'Manual',
    report: 'Report Issues',
    exit: 'Exit',
    dev: 'Debug',
    devtools: 'Toggle Devtools',
    exportLogs: 'Export Logs',
    clearCache: 'Clear Local Cache',
    confirmToClearCacheData: 'Are you sure to clear cache data of this app?',
    confirmToRelaunch: 'Are you sure to relaunch this app?',
    relaunch: 'Relaunch',
    myLib: 'Manage My Library',
    nodeAndNetwork: 'Node and Network',
    editProfile: 'Edit Profile',
    editWallet: 'Edit Wallet',
    exportKey: 'Export Key',
    importKey: 'Import Key',
    switchLang: 'Change Language',
  },
  init: {
    signupNode: 'Build node',
    signupNodeTip: 'First time use',
    loginNode: 'Login Node',
    loginNodeTip: 'Already have a node',
    externalNode: 'External Node',
    externalNodeTip: 'Connect to available node',
    importNode: 'Import Node',
    exportNode: 'Export Node',
    storagePathTip: [
      'Please select a folder to store node data',
      'This data belongs to you only',
      'We do not store your data, so we cannot retrieve it for you.',
      'Please keep it in a safe place',
    ],
    storagePathLoginTip: [
      'You selected a folder when building a node',
      'where your node information is stored',
      'Please reselect this folder',
      'to log in to this node',
    ],
    selectFolder: 'Select Folder',
    createPassword: 'Create password',
    inputPassword: 'Enter password',
    savePassword: 'Remember password',
    useNewConfig: 'Create new config',
    selectExistedConfig: 'Or select a previous config',
    hostPlaceHolder: '127.0.0.1 (optional)',
    portPlaceHolder: 'port',
    jwtPlaceHolder: 'jwt (optional)',
    tlsPlaceHolder: 'TLS cert',
    connectExternalNode: 'Connect to External Node',
    starting: 'Starting...',
    startingTooLong: 'Starting taks too long, you can try...',
    wrongPassword: 'Start failed, wrong password...',
    startFailed: 'Start failed...',
    connectExternalNodeFailed: 'Failed to connect to external node...',
    youCanTry: 'you can try',
  },
  myLib: {
    title: 'Title',
    author: 'Author',
    tags: 'Tags',
    size: 'Size(MB)',
    format: 'Format',
    rating: 'Rate',
    oparation: 'Operations',
    leaveGroup: 'Are you sure to quit the SeedNet contains this book?',
    filter: 'Filters',
    contentType: 'Content Type',
    bookCategories: 'Categories',
    language: 'Language',
    myLib: 'My Library: ',
    books: 'Books',
    sort: 'Sort',
    filterBook: 'filter books',
    openBook: 'Read',
    recentAdd: 'Recently Added',
    recentOpen: 'Recently Read',
    coverMode: 'Book-cover View',
    listMode: 'List View',
    na: 'n/a',
    emptyTip: [
      'Nothing Here...',
      'Join a SeedNet，books and contents in the SeedNet will show up here.',
    ],
  },
  mixin: {
    connectMixin: 'Link to Mixin wallet',
    connectMixinPrivacyTip: 'Your Mixin Account will be exposed to who transfer money to you. In the future, we will provide a more anonymous transfer method to Improve privacy ',
    mixinScanToConnect: 'Use Mixin to scan QR Code to connect your wallet',
    noMixinOnYourPhone: "Hasn't installed Mixin yet?",
    toDownload: 'Mixin App download',
    confirmUnbindMixin: 'Are you sure to unbind mixin wallet?',
    failToFetchMixinProfile: 'Failed to obtain Mixin Profile',
  },
  profile: {
    setupProfile: 'Edit Profile',
    editProfile: 'Edit Profile',
    editSuccess: 'Edit Success!',
    change: 'change',
    nickname: 'nickname',
    connectWallet: 'connect wallet',
    syncingProfile: 'syncing profile',
  },
  imageLib: {
    keyword: 'Keyword',
    pixabayLicenseTip: 'Pictures are powered by Pixabay, free to use',
    emptyImageSearchResult: 'No relevant pictures have been searched yet',
    imageSearchTip1: 'Try another keyword',
    imageSearchTip2: 'You can also try in English',
  },
  update: {
    downloading: 'downloading',
    updating: 'checking updates',
    alreadyLatestVersion: 'latest version installed',
    newVersionPublished: (version: string) => `New Version ${version} Published`,
    reloadForUpdate: 'Restart for Update',
    doItLater: 'Do it later',
  },
  operations: {
    cancel: 'Cancel',
    back: 'Back',
    save: 'Save',
    confirm: 'Confirm',
    prevStep: 'Previous',
    nextStep: 'Next',
    closeWindow: 'Close Window',
    edit: 'Edit',
  },
  ago: {
    justNow: 'just now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    daysAgo: 'days ago',
  },
  shareGroup: {
    downloadedThenShare: 'downloaded, go to share with your friends',
    shareSeed: 'Share Seed',
    copySeed: 'Copy the seed',
    copySeedOr: 'or',
    downloadSeed: 'Download seed file',
    joinSeedGroup: 'Join This SeedNet',
    openSeedGroup: 'Open This SeedNet',
  },
  manageGroup: {
    savedAndWaitForSyncing: 'Saved and wait for syncing',
    title: 'SeedNet Basic Info',
    manageGroupSkip: 'Skip, setup later',
  },
  node: {
    nodeDataNotExist: 'There is no node data in this folder, please select again',
    keyStoreNotExist: 'The folder has no keystore',
    connectedPeerCount: (count: number) => `Connected ${count} nodes`,
    connectedPeerCountTip: (count: number) => `Your node is connected to ${count} nodes in the network`,
    confirmToExitNode: 'Are you sure to exit the node? ',
    exitingNode: 'Exiting Node...',
    nodeParams: 'Params',
    port: 'Port',
    tslCert: 'tls certificate',
    networkStatus: 'Network',
    status: 'Status',
    traffic: 'traffic',
    lastHour: 'last hour',
    lastDay: 'last day',
    lastMouth: 'last mouth',
    nodeInfo: 'Node Info',
    storageDir: 'Data Storage folder',
    detail: 'detail',
    version: 'Version',
    exitNode: 'Exit Node',
    refresh: 'Reload',
  },
  avatar: {
    selectProvider: 'Chose Avatar From...',
    selectFromImageLib: 'Image Library',
    makeAnAvatar: 'Make One',
    selectAvatar: 'Select Avatar',
    uploadImage: 'Upload',
    replace: 'Replace',
    upload: 'Upload',
    image: 'Image',
    moveOrDragImage: 'Move or Drag',
  },
  backup: {
    exportKey: 'Key Export...',
    importKey: 'Key Import...',
    selectKeyBackupToImport: 'Select the backup file to import the Key',
    selectedKeyBackupFile: 'Backup file is selected',
    selectKeyBackupFile: 'Select backup file',
    selectFolder: 'Select Folder',
    storagePathTip2: 'Please select a folder to store node data. The data belongs to you only. We do not store your data, so we cannot retrieve it for you. Please keep it in a safe place.',
    importKeyDataDone: 'Import Done',
    failedToReadBackipFile: 'Failed to read backup file.',
    notAValidZipFile: 'Not a valid zip file.',
    isNotEmpty: 'Folder is not empty.',
    incorrectPassword: 'Password is incorrect.',
    writePermissionDenied: 'Do not have permission to write in the folder.',
    exportCurrentNodeNeedToQuit: 'Export KeyData Of Current Node Need To Quit, Are You Sure?',
    edit: 'Edit',
    password: 'Password',
    enterPassword: 'Enter Password',
    backOneStep: 'Previous Step',
    exportKeyDataDone: 'Export Done',
    keyStoreNotExist: 'No Keystore data in the folder, please check.',
    nodeDataNotExist: 'No node data in the folder you selected, please check.',
    storagePathLoginTip2: 'You have selected a folder when a node was created, open the folder again to log in the node.',
    selectFolderToSaveKeyBackupFile: 'Select folder to save backup file',
  },
  trx: {
    blockInfo: 'Block Info',
    group: 'SeedNet',
    data: 'Data',
    sign: 'Signature',
    sender: 'Sender',
    timestamp: 'Timestamp',
    version: 'Version',
    syncing: 'syncing',
    synced: 'synced',
    failToLoadTrx: 'fail to load trx',
  },
  or: 'Or',
  require: (name: string) => `Please enter ${name}`,
  somethingWrong: 'It looks like something went wrong',
  copy: 'Copy',
  copied: 'copied',
  search: 'Search',
  searchText: 'Please enter the keywords',
};

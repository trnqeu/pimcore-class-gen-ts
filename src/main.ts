import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

import type {
  PimcoreClassDefinition,
  FieldSpec,
  LayoutDefinition,
  DataDefinition,
  PropertyVisibility,
  // Specific Field Types
  InputFieldDefinition,
  TextareaFieldDefinition,
  SelectFieldDefinition,
  DateFieldDefinition,
  LocalizedFieldsDefinition,
  BlockFieldDefinition,
  WysiwygFieldDefinition,
  ImageGalleryFieldDefinition,
  VideoFieldDefinition,
  ManyToManyRelationFieldDefinition,
  LinkFieldDefinition,
  TextFieldDefinition,
  PanelLayoutDefinition,
  FieldsetLayoutDefinition,
  TabPanelLayoutDefinition,
  TextLayoutDefinition,
  AnyFieldDefinition,
  AnySpecificFieldDefinition,
} from './types/pimcore-types';


// read csv file
// read command line argument
const csvFilePathArg = process.argv[2];

// check if the argument is present
if (!csvFilePathArg) {
  console.error('Errore: Percorso del file CSV non fornito.');
  console.log('Uso: node dist/main.js <percorso-del-file-csv>');
  process.exit(1); // Esce dal programma con un codice di errore
}

// make path absolut
const csvFilePath = path.resolve(csvFilePathArg);

// check if file exists

if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found at path: ${csvFilePath}`);
    process.exit(1);
}

// read and process csv file
console.log(`Reading file: ${csvFilePath}`);

const csvContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  delimiter: ',', // O il delimitatore che usi
});

// Transform data into a clean typed data structure
const fieldSpecs: FieldSpec[] = records.map((record: any) => {
  // Clean bundle name stripping ca_attribute_
  const normalizeBundle = (bundle: string): { name: string; containerKey?: string } => {
    let name = bundle.replace(/^ca_attribute_/, ''); // Rimuove il prefisso
    if (name.includes('.')) {
      const parts = name.split('.');
      return {
        name: parts[1], // es. 'segnatura2'
        containerKey: parts[0], // es. 'segnatura'
      };
    }
    return { name };
  };

  const normalized = normalizeBundle(record['Bundle']);

  return {
    screenId: record['Screen ID'],
    bundle: record['Bundle'],
    datatype: record['Datatype'],
    name: normalized.name,
    title: record['Name'], // 'Name' column contains the title
    isContainer: record['is container'] === 'TRUE',
    isRipetibile: record['is ripetibile'] === 'TRUE',
    wysiwyg: record['wysiwyg'] === 'TRUE',
    listValues: record['List Values'] ? record['List Values'].split(';').map((v: string) => v.trim()) : [],
    containerKey: normalized.containerKey,
  };
});

console.log('Normalized fieldSpecs:', fieldSpecs);

// ---CLASS GENERATION---

export class PimcoreClassGenerator {
    private classDefinition: PimcoreClassDefinition;

    constructor(baseDefinition?: Partial<PimcoreClassDefinition>) {
    this.classDefinition = {
      id: '',
      title: '',
      description: '',
      modificationDate: Math.floor(Date.now() / 1000),
      parentClass: '',
      implementsInterfaces: '',
      listingParentClass: '',
      useTraits: '',
      listingUseTraits: '',
      allowInherit: false,
      allowVariants: false,
      showVariants: false,
      layoutDefinitions: {
        name: 'pimcore_root',
        type: null,
        region: null,
        title: null,
        width: 0,
        height: 0,
        collapsible: false,
        collapsed: false,
        bodyStyle: null,
        datatype: 'layout',
        children: [],
        locked: false,
        fieldtype: 'panel',
        layout: null,
        border: false,
        icon: '',
        labelWidth: 100,
        labelAlign: 'left',
      },
      icon: '',
      group: '',
      showAppLoggerTab: false,
      linkGeneratorReference: '',
      previewGeneratorReference: '',
      compositeIndices: [],
      showFieldLookup: false,
      propertyVisibility: {
        grid: {
          id: true,
          key: false,
          path: true,
          published: true,
          modificationDate: true,
          creationDate: true,
        },
        search: {
          id: true,
          key: false,
          path: true,
          published: true,
          modificationDate: true,
          creationDate: true,
        },
      },
      enableGridLocking: false,
      ...baseDefinition, // Allow overriding base definition
    };
  }

  public setClassId(id: string): PimcoreClassGenerator {
    this.classDefinition.id = id;
    return this;
  }

  public setTitle(title: string): PimcoreClassGenerator {
    this.classDefinition.title = title;
    return this;
  }

  public setDescription(description: string): PimcoreClassGenerator {
    this.classDefinition.description = description;
    return this;
  }

  public setGroup(group: string): PimcoreClassGenerator {
    this.classDefinition.group = group;
    return this;
  }

  public setIcon(icon: string): PimcoreClassGenerator {
    this.classDefinition.icon = icon;
    return this;
  }

  // Add a field at the root level of the layout (inside the main panel)
  public addRootField(field: AnyFieldDefinition): PimcoreClassGenerator {
    this.classDefinition.layoutDefinitions.children.push(field);
    return this;
  }

  // Add a field inside a specific layout container (by name)
  public addFieldToContainer(containerName: string, field: AnyFieldDefinition): PimcoreClassGenerator {
    const findAndAdd = (items: AnyFieldDefinition[]): boolean => {
      for (const item of items) {
        if (item.name === containerName && 'children' in item && Array.isArray(item.children)) {
          item.children.push(field);
          return true;
        }
        if ('children' in item && Array.isArray(item.children)) {
          if (findAndAdd(item.children)) {
            return true;
          }
        }
      }
      return false;
    };

    if (!findAndAdd(this.classDefinition.layoutDefinitions.children)) {
      console.warn(`Container with name '${containerName}' not found. Field not added.`);
    }
    return this;
  }

  // Helper methods to create specific field definitions
  public createInputField(definition: Partial<InputFieldDefinition>): InputFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'input',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      defaultValue: null,
      columnLength: 190,
      regex: '',
      regexFlags: [],
      unique: false,
      showCharCount: false,
      width: '',
      defaultValueGenerator: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createTextareaField(definition: Partial<TextareaFieldDefinition>): TextareaFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'textarea',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      maxLength: null,
      showCharCount: false,
      excludeFromSearchIndex: false,
      height: '',
      width: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createSelectField(definition: Partial<SelectFieldDefinition>): SelectFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'select',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      options: [],
      defaultValue: '',
      columnLength: 190,
      dynamicOptions: false,
      defaultValueGenerator: '',
      width: '',
      optionsProviderType: null,
      optionsProviderClass: '',
      optionsProviderData: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createDateField(definition: Partial<DateFieldDefinition>): DateFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'date',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      defaultValue: null,
      useCurrentDate: false,
      columnType: 'bigint(20)', // Default Pimcore date column type
      width: '',
      defaultValueGenerator: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createLocalizedFields(definition: Partial<LocalizedFieldsDefinition>): LocalizedFieldsDefinition {
    return {
      name: 'localizedfields',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'localizedfields',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      children: [],
      region: null,
      layout: null,
      maxTabs: null,
      border: false,
      provideSplitView: false,
      tabPosition: 'top',
      hideLabelsWhenTabsReached: null,
      permissionView: null,
      permissionEdit: null,
      labelWidth: 0,
      labelAlign: 'left',
      width: '',
      height: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createBlockField(definition: Partial<BlockFieldDefinition>): BlockFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'block',
      relationType: false,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      lazyLoading: false,
      disallowAddRemove: false,
      disallowReorder: false,
      collapsible: false,
      collapsed: false,
      maxItems: null,
      styleElement: '',
      children: [],
      layout: null,
      width: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createWysiwygField(definition: Partial<WysiwygFieldDefinition>): WysiwygFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'wysiwyg',
      relationType: false,
      invisible: false,
      visibleGridView: false,
      visibleSearch: false,
      toolbarConfig: '',
      excludeFromSearchIndex: false,
      maxCharacters: '0',
      height: '',
      width: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createImageGalleryField(definition: Partial<ImageGalleryFieldDefinition>): ImageGalleryFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'imageGallery',
      relationType: false,
      invisible: false,
      visibleGridView: false,
      visibleSearch: false,
      uploadPath: '',
      ratioX: null,
      ratioY: null,
      predefinedDataTemplates: '',
      height: '',
      width: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createVideoField(definition: Partial<VideoFieldDefinition>): VideoFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'video',
      relationType: false,
      invisible: false,
      visibleGridView: false,
      visibleSearch: false,
      uploadPath: '',
      allowedTypes: null,
      supportedTypes: ['asset', 'youtube', 'vimeo', 'dailymotion'],
      height: 300,
      width: 300,
      datatype: 'data',
      ...definition,
    };
  }

  public createManyToManyRelationField(definition: Partial<ManyToManyRelationFieldDefinition>): ManyToManyRelationFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'manyToManyRelation',
      relationType: true,
      invisible: false,
      visibleGridView: true,
      visibleSearch: true,
      classes: [],
      displayMode: null,
      pathFormatterClass: '',
      maxItems: null,
      assetInlineDownloadAllowed: false,
      assetUploadPath: '',
      allowToClearRelation: true,
      objectsAllowed: false,
      assetsAllowed: true,
      assetTypes: [],
      documentsAllowed: false,
      documentTypes: [],
      enableTextSelection: false,
      width: '',
      height: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createLinkField(definition: Partial<LinkFieldDefinition>): LinkFieldDefinition {
    return {
      name: '',
      title: '',
      tooltip: '',
      mandatory: false,
      noteditable: false,
      index: false,
      locked: false,
      style: '',
      permissions: null,
      fieldtype: 'link',
      relationType: false,
      invisible: false,
      visibleGridView: false,
      visibleSearch: false,
      allowedTypes: null,
      allowedTargets: null,
      disabledFields: null,
      width: '',
      datatype: 'data',
      ...definition,
    };
  }

  public createTextLayout(definition: Partial<TextLayoutDefinition>): TextLayoutDefinition {
    return {
      name: '',
      type: null,
      region: null,
      title: '',
      width: 0,
      height: 0,
      collapsible: false,
      collapsed: false,
      bodyStyle: '',
      datatype: 'layout',
      children: [],
      fieldtype: 'text',
      html: '',
      renderingClass: '',
      renderingData: '',
      border: false,
      locked: false,
      labelWidth: 100,
      labelAlign: 'left',
      ...definition,
    };
  }

  // Helper methods to create specific layout containers
  public createPanel(definition: Partial<PanelLayoutDefinition>): PanelLayoutDefinition {
    return {
      name: '',
      type: null,
      region: null,
      title: '',
      width: 0,
      height: 0,
      collapsible: false,
      collapsed: false,
      bodyStyle: '',
      datatype: 'layout',
      children: [],
      fieldtype: 'panel',
      layout: null,
      border: false,
      icon: '',
      labelWidth: 100,
      labelAlign: 'left',
      locked: false,
      ...definition,
    };
  }

  public createFieldset(definition: Partial<FieldsetLayoutDefinition>): FieldsetLayoutDefinition {
    return {
      name: '',
      type: null,
      region: null,
      title: '',
      width: 0,
      height: 0,
      collapsible: false,
      collapsed: false,
      bodyStyle: '',
      datatype: 'layout',
      children: [],
      fieldtype: 'fieldset',
      labelWidth: 100,
      labelAlign: 'left',
      locked: false,
      ...definition,
    };
  }

  public createTabPanel(definition: Partial<TabPanelLayoutDefinition>): TabPanelLayoutDefinition {
    return {
      name: 'pimcore_root', // Default name for root tab panel
      type: null,
      region: null,
      title: null,
      width: 0,
      height: 0,
      collapsible: false,
      collapsed: false,
      bodyStyle: null,
      datatype: 'layout',
      children: [],
      fieldtype: 'tabpanel',
      border: false,
      tabPosition: 'top',
      locked: false,
      ...definition,
    };
  }

  public generate(): PimcoreClassDefinition {
    // Ensure modification date is current
    this.classDefinition.modificationDate = Math.floor(Date.now() / 1000);
    return JSON.parse(JSON.stringify(this.classDefinition)); // Deep clone to prevent external mutation
  }

  public generateJsonString(): string {
    return JSON.stringify(this.generate(), null, 2);
  }
}



const generator = new PimcoreClassGenerator();
generator.setClassId('GeneratedClass'); // Potresti renderlo dinamico
generator.setTitle('Generated Class');

generator.setClassId('50');

const tabPanel = generator.createTabPanel({
    name: 'Scheda descrittiva',
    title: 'Scheda descrittiva',
});

generator.addRootField(tabPanel);


const identificazionePanel = generator.createPanel({
    name: 'Identificazione',
    title: 'IDENTIFICAZIONE',
});

const localizedfields = generator.createLocalizedFields({
    name: 'localizedfields',
    width: 1000,
    border: true,
});

const dcType = generator.createInputField({
    name: 'dcType',
    title: 'Livello di descrizione',
});

const dcTitle = generator.createTextareaField({
    name: 'dcTitle',
    title: 'Titolo',
    height: 100,
    width: 850,
});

const tipologiaTitolo = generator.createSelectField({
    name: 'tipologia_titolo',
    title: 'Tipologia titolo',
    options: [
        { key: 'attribuito', value: 'attribuito' },
        { key: 'non specificato', value: 'non specificato' },
        { key: 'originale', value: 'originale' },
        { key: 'originale/attribuito', value: 'originale/attribuito' },
    ],
});

const titoliAltBlock = generator.createBlockField({
    name: 'titoli_alt_block',
    title: 'Titoli alternativi',
    style: 'margin-top:15px;margin-bottom:15px;width:950px',
});

const titoloAlternativo = generator.createTextareaField({
    name: 'titolo_alternativo',
    title: 'Titolo',
    height: 20,
    width: 850,
});

const tipologiaTitoloAlt = generator.createSelectField({
    name: 'tipologia_titolo_alt',
    title: 'Tipologia titolo',
    options: [
        { key: 'alternativo', value: 'alternativo' },
        { key: 'non specificato', value: 'non specificato' },
        { key: 'originale', value: 'originale' },
        { key: 'parallelo', value: 'parallelo' },
    ],
});

titoliAltBlock.children.push(titoloAlternativo);
titoliAltBlock.children.push(tipologiaTitoloAlt);

localizedfields.children.push(dcType);
localizedfields.children.push(dcTitle);
localizedfields.children.push(tipologiaTitolo);
localizedfields.children.push(titoliAltBlock);

identificazionePanel.children.push(localizedfields);

const provNumContainer = generator.createFieldset({
    name: 'prov_num_container',
    title: 'Numerazione provvisoria',
    width: 1000,
});

const provPrefix = generator.createInputField({
    name: 'prov_prefix',
    title: 'Prefisso',
    width: 100,
});

const provNum = generator.createInputField({
    name: 'prov_num',
    title: 'Numero',
});

const provSuffix = generator.createSelectField({
    name: 'prov_suffix',
    title: 'Suffisso',
    width: 100,
    options: [
        { key: 'Bis', value: 'Bis' },
        { key: 'Ter', value: 'Ter' },
        { key: 'Quater', value: 'Quater' },
        { key: 'Quinquies', value: 'Quinquies' },
        { key: 'Sexies', value: 'Sexies' },
        { key: 'Septies', value: 'Septies' },
        { key: 'Octies', value: 'Octies' },
        { key: 'Novies', value: 'Novies' },
        { key: 'Decies', value: 'Decies' },
        ...Array.from({ length: 40 }, (_, i) => ({ key: (i + 1).toString(), value: (i + 1).toString() })),
    ],
});

provNumContainer.children.push(provPrefix);
provNumContainer.children.push(provNum);
provNumContainer.children.push(provSuffix);

identificazionePanel.children.push(provNumContainer);

const defNumContainer = generator.createFieldset({
    name: 'def_num_container',
    title: 'Numerazione definitiva',
    width: 1000,
});

const defPrefix = generator.createInputField({
    name: 'def_prefix',
    title: 'Prefisso',
    width: 100,
});

const defNum = generator.createInputField({
    name: 'def_num',
    title: 'Numero',
});

const defSuffix = generator.createSelectField({
    name: 'def_suffix',
    title: 'Suffisso',
    width: 100,
    options: [
        { key: 'Bis', value: 'Bis' },
        { key: 'Ter', value: 'Ter' },
        { key: 'Quater', value: 'Quater' },
        { key: 'Quinquies', value: 'Quinquies' },
        { key: 'Sexies', value: 'Sexies' },
        { key: 'Septies', value: 'Septies' },
        { key: 'Octies', value: 'Octies' },
        { key: 'Novies', value: 'Novies' },
        { key: 'Decies', value: 'Decies' },
        ...Array.from({ length: 40 }, (_, i) => ({ key: (i + 1).toString(), value: (i + 1).toString() })),
    ],
});

defNumContainer.children.push(defPrefix);
defNumContainer.children.push(defNum);
defNumContainer.children.push(defSuffix);

identificazionePanel.children.push(defNumContainer);

const dateContainer = generator.createFieldset({
    name: 'date',
    title: 'Datazione',
    width: 500,
});

const from = generator.createDateField({
    name: 'from',
    title: 'Data (da)',
});

const to = generator.createDateField({
    name: 'to',
    title: 'Data (a)',
});

const dateLocalizedfields = generator.createLocalizedFields({
    name: 'localizedfields',
});

const datetext = generator.createInputField({
    name: 'datetext',
    title: 'Data (testuale)',
});

const tipologiaData = generator.createInputField({
    name: 'tipologia_data',
    title: 'Tipologia data',
});

const noteData = generator.createTextareaField({
    name: 'note_data',
    title: 'Note alla data',
});

dateLocalizedfields.children.push(datetext);
dateLocalizedfields.children.push(tipologiaData);
dateLocalizedfields.children.push(noteData);

const dateBlock = generator.createBlockField({
    name: 'date_block',
    title: 'Altre datazioni',
    style: 'width:500px',
});

const fromBlock = generator.createDateField({
    name: 'from_block',
    title: 'Data (da)',
});

const toBlock = generator.createDateField({
    name: 'to_block',
    title: 'Data (a)',
});

const dateBlockLocalizedfields = generator.createLocalizedFields({
    name: 'localizedfields',
});

const datetextBlock = generator.createInputField({
    name: 'datetext_block',
    title: 'Data (testuale)',
});

const tipologiaDataBlock = generator.createInputField({
    name: 'tipologia_data_block',
    title: 'Tipologia data',
});

const noteDataBlock = generator.createTextareaField({
    name: 'note_data_block',
    title: 'Note alla data',
});

dateBlockLocalizedfields.children.push(datetextBlock);
dateBlockLocalizedfields.children.push(tipologiaDataBlock);
dateBlockLocalizedfields.children.push(noteDataBlock);

dateBlock.children.push(fromBlock);
dateBlock.children.push(toBlock);
dateBlock.children.push(dateBlockLocalizedfields);

dateContainer.children.push(from);
dateContainer.children.push(to);
dateContainer.children.push(dateLocalizedfields);
dateContainer.children.push(dateBlock);

identificazionePanel.children.push(dateContainer);

const sourceId = generator.createInputField({
    name: 'source_id',
    title: 'Identificativo di origine',
});

identificazionePanel.children.push(sourceId);

const controlloNotePanel = generator.createPanel({
    name: 'Controllo e note',
    title: 'CONTROLLO E NOTE',
});

const controlloNoteLocalizedfields = generator.createLocalizedFields({
    name: 'localizedfields',
});

const notes = generator.createWysiwygField({
    name: 'notes',
    title: 'Note',
});

const archivistNotes = generator.createWysiwygField({
    name: 'archivist_notes',
    title: "Note dell'archivista",
});

controlloNoteLocalizedfields.children.push(notes);
controlloNoteLocalizedfields.children.push(archivistNotes);

controlloNotePanel.children.push(controlloNoteLocalizedfields);

const responsibilitiesContainer = generator.createFieldset({
    name: 'responsibilities',
    title: 'Responsabilità',
});

const cataloguer = generator.createInputField({
    name: 'cataloguer',
    title: 'Compilatore',
});

const funzResponsabile = generator.createInputField({
    name: 'funz_responsabile',
    title: 'Funzionario responsabile',
});

const action = generator.createSelectField({
    name: 'action',
    title: 'Azione',
    options: [
        { key: 'creazione', value: 'creazione' },
        { key: 'bozza', value: 'bozza' },
        { key: 'revisione', value: 'revisione' },
        { key: 'versione finale', value: 'versione finale' },
        { key: 'pubblicazione', value: 'pubblicazione' },
    ],
});

const responsibilityDate = generator.createDateField({
    name: 'responsibility_date',
    title: 'Data',
});

const noteCompilazione = generator.createTextareaField({
    name: 'note_compilazione',
    title: 'Note',
});

const otherResponsibilities = generator.createBlockField({
    name: 'other_responsibilities',
    title: 'Altre responsabilità',
});

const cataloguer1 = generator.createInputField({
    name: 'cataloguer1',
    title: 'Compilatore',
});

const funzResponsabile1 = generator.createInputField({
    name: 'funz_responsabile1',
    title: 'Funzionario responsabile',
});

const action1 = generator.createSelectField({
    name: 'action1',
    title: 'Azione',
    options: [
        { key: 'creazione', value: 'creazione' },
        { key: 'bozza', value: 'bozza' },
        { key: 'revisione', value: 'revisione' },
        { key: 'versione finale', value: 'versione finale' },
        { key: 'pubblicazione', value: 'pubblicazione' },
    ],
});

const responsibilityDate1 = generator.createDateField({
    name: 'responsibility_date1',
    title: 'Data',
});

const noteCompilazione1 = generator.createTextareaField({
    name: 'note_compilazione1',
    title: 'Note',
});

otherResponsibilities.children.push(cataloguer1);
otherResponsibilities.children.push(funzResponsabile1);
otherResponsibilities.children.push(action1);
otherResponsibilities.children.push(responsibilityDate1);
otherResponsibilities.children.push(noteCompilazione1);

responsibilitiesContainer.children.push(cataloguer);
responsibilitiesContainer.children.push(funzResponsabile);
responsibilitiesContainer.children.push(action);
responsibilitiesContainer.children.push(responsibilityDate);
responsibilitiesContainer.children.push(noteCompilazione);
responsibilitiesContainer.children.push(otherResponsibilities);

controlloNotePanel.children.push(responsibilitiesContainer);

const levelOfDescription = generator.createSelectField({
    name: 'level_of_description',
    title: 'Livello di catalogazione',
    options: [
        { key: 'convalidato', value: 'convalidato' },
        { key: 'definitivo', value: 'definitivo' },
        { key: 'prima redazione', value: 'prima redazione' },
        { key: 'rivisto', value: 'rivisto' },
    ],
});

controlloNotePanel.children.push(levelOfDescription);

const mediaPanel = generator.createPanel({
    name: 'Media',
    title: 'MEDIA E COLLEGAMENTI',
});

const photoGallery = generator.createImageGalleryField({
    name: 'PhotoGallery',
    title: 'Galleria fotografica',
    style: 'margin: 20px',
});

const video = generator.createVideoField({
    name: 'Video',
    title: 'Video',
    style: 'margin: 20px',
});

const pdf = generator.createManyToManyRelationField({
    name: 'PDF',
    title: 'PDF',
    style: 'margin:20px',
    assetTypes: [{ assetTypes: 'text' }, { assetTypes: 'document' }],
});

const fileAudio = generator.createManyToManyRelationField({
    name: 'File_audio',
    title: 'File audio',
    style: 'margin:20px',
    assetTypes: [{ assetTypes: 'audio' }],
});

const otherFiles = generator.createManyToManyRelationField({
    name: 'other_files',
    title: 'Altri file',
    style: 'margin:20px',
    assetTypes: [
        { assetTypes: 'unknown' },
        { assetTypes: 'image' },
        { assetTypes: 'archive' },
        { assetTypes: 'audio' },
        { assetTypes: 'document' },
        { assetTypes: 'folder' },
        { assetTypes: 'text' },
        { assetTypes: 'video' },
    ],
});

const linkEsterni = generator.createBlockField({
    name: 'link_esterni',
    title: 'Link esterni',
    style: 'margin:20px;width:300px',
});

const link = generator.createLinkField({
    name: 'Link',
    title: 'Link',
});

linkEsterni.children.push(link);

mediaPanel.children.push(photoGallery);
mediaPanel.children.push(video);
mediaPanel.children.push(pdf);
mediaPanel.children.push(fileAudio);
mediaPanel.children.push(otherFiles);
mediaPanel.children.push(linkEsterni);

const sommarioPanel = generator.createPanel({
    name: 'Sommario',
    title: 'SOMMARIO',
});

const sommarioText = generator.createTextLayout({
    name: 'Sommario',
    title: 'Sommario',
    renderingClass: 'App\\PromemoriaBundle\\Renderer\\SummaryRenderer',
});

sommarioPanel.children.push(sommarioText);

tabPanel.children.push(identificazionePanel);
tabPanel.children.push(controlloNotePanel);
tabPanel.children.push(mediaPanel);
tabPanel.children.push(sommarioPanel);


const panelNameMapping: { [key: string]: string } = {
    'IDENTIFICAZIONE': 'Identificazione',
    'CONTROLLO E NOTE': 'Controllo e note',
    'MEDIA E COLLEGAMENTI': 'Media',
    // Aggiungi altre mappature se necessario
};

// Controlla se il CSV richiede pannelli che non esistono nella base statica e creali.
const existingPanelNames = new Set(Object.values(panelNameMapping));

// Find all unique screenId
const screenIds = [...new Set(fieldSpecs.map(spec => spec.screenId))];


// Crea un pannello per ogni screenId e lo aggiunge al TabPanel
screenIds.forEach(id => {
    const technicalName = panelNameMapping[id] || id.toLowerCase().replace(/\s+/g, '_');
    if (!existingPanelNames.has(technicalName)) {
        console.log(`Pannello dinamico '${id}' non trovato nella base statica. Lo creo...`);
        const newPanel = generator.createPanel({
            name: technicalName,
            title: id.toUpperCase(),
        });
        tabPanel.children.push(newPanel);
        panelNameMapping[id] = technicalName; // Aggiorna la mappa per dopo
    }
});


// Ora itera su TUTTI i campi del CSV e inseriscili nel pannello corretto.
fieldSpecs.forEach(spec => {
    let newField: AnyFieldDefinition | null = null;
    
    const targetPanelName = panelNameMapping[spec.screenId];
    if (!targetPanelName) {
        console.warn(`Attenzione: Nessun pannello di destinazione trovato per lo Screen ID '${spec.screenId}'. Il campo '${spec.name}' sarà saltato.`);
        return;
    }

    // Qui inseriremo la logica per isContainer e isRipetibile. Per ora, gestiamo i semplici.
    if (spec.isContainer || spec.isRipetibile) {
        // TODO: Implementare logica per contenitori e campi ripetibili
        return;
    }
    
    // Crea il campo in base al datatype
    switch (spec.datatype) {
        case 'Text':
            newField = spec.wysiwyg 
                ? generator.createWysiwygField({ name: spec.name, title: spec.title })
                : generator.createTextareaField({ name: spec.name, title: spec.title });
            break;
        case 'Numeric':
            newField = generator.createInputField({ name: spec.name, title: spec.title });
            break;
        case 'List':
            newField = generator.createSelectField({
                name: spec.name,
                title: spec.title,
                options: spec.listValues.map(val => ({ key: val, value: val })),
            });
            break;
    }
    
    // Se il campo è stato creato, INIETTALO nel pannello corretto
    if (newField) {
        generator.addFieldToContainer(targetPanelName, newField);
    }
});

// generator.addRootField(tabPanel);

const generatedClass = generator.generateJsonString();

const outputPath = path.join(__dirname, '..', 'GeneratedClass.json');

fs.writeFile(outputPath, generatedClass, (err) => {
  if (err) {
    console.error('Error writing file:', err);
  } else {
    console.log('Successfully generated class file at', outputPath);
  }
});

export {};

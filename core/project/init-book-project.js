'use strict';

const fs = require('fs');
const path = require('path');
const { getBookRoot, getBookConfigPath } = require('../paths/path-resolver');
const { validateProjectInit } = require('./project-initialization-validator');
const { buildBookConfig } = require('./book-config-template');
const { buildFolderSkeleton } = require('./chapter-skeleton-builder');
const { generateProjectPlan } = require('./project-plan-generator');
const { writeWorkflowState } = require('../state/write-workflow-state');

/**
 * Initializes a new book project dataset.
 * 
 * @param {object} params 
 * @param {string} params.bookSlug 
 * @param {string} params.title 
 * @param {string} [params.sourceUrl=""] 
 * @param {string} [params.sourceProvider="openstax"] 
 * @param {string} [params.sourceLanguage="en"] 
 * @param {string} [params.targetLanguage="vi"] 
 * @param {string} [params.datasetVersion="v1"] 
 * @param {number} [params.chapterCount=0]
 * @param {boolean} [params.dryRun=false]
 * @param {boolean} [params.force=false]
 * @param {boolean} [params.confirmOverwrite=false]
 * @returns {object} Initialization result summary
 */
async function initBookProject(params) {
  const dryRun = !!params.dryRun;
  const force = !!params.force;
  const confirmOverwrite = !!params.confirmOverwrite;
  const bookSlug = params.bookSlug;
  const bookRoot = getBookRoot(bookSlug);

  // 1. Validate parameters
  const validation = validateProjectInit(params, { force });
  if (!validation.valid) {
    return {
      status: 'failed',
      errors: validation.errors
    };
  }

  // 2. Safety check: Check if directory exists
  const bookExists = fs.existsSync(bookRoot);
  const filesCreated = [];
  const filesUpdated = [];
  const filesSkipped = [];
  const warnings = [];

  if (bookExists) {
    if (!force) {
      return {
        status: 'failed',
        errors: [`Book project directory already exists at: ${bookRoot}. Use --force to proceed.`]
      };
    }

    // With --force, we backup files we are going to write if they already exist
    warnings.push(`Project directory '${bookSlug}' already exists. Executing in force/overwrite mode.`);
  }

  // Define files we will create/write
  const configPath = getBookConfigPath(bookSlug);
  const glossaryPath = path.join(bookRoot, 'glossary.csv');
  const styleCssPath = path.join(bookRoot, 'css', 'style.css');
  const prepDebugCssPath = path.join(bookRoot, 'css', 'prep-debug.css');

  if (dryRun) {
    // Collect what would be created
    const folders = buildFolderSkeleton(bookSlug, { chapterCount: params.chapterCount, dryRun: true });
    
    const wouldCreate = [
      path.relative(path.join(bookRoot, '..'), configPath).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), glossaryPath).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), styleCssPath).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), prepDebugCssPath).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'project-plan.json')).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'project-plan.md')).replace(/\\/g, '/'),
      path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'workflow-state.json')).replace(/\\/g, '/'),
    ];

    return {
      status: 'dry_run_passed',
      bookSlug,
      title: params.title,
      dryRun: true,
      foldersWouldCreate: folders,
      filesWouldCreate: wouldCreate,
      warnings
    };
  }

  // --- Real execution ---

  // 3. Create folders
  buildFolderSkeleton(bookSlug, { chapterCount: params.chapterCount, dryRun: false });

  // Helper to safely write or overwrite with backup/warning
  const writeFileSafely = (filePath, content, isJson = false) => {
    const relativePath = path.relative(path.join(bookRoot, '..'), filePath).replace(/\\/g, '/');
    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
      if (!force) {
        filesSkipped.push({ file: relativePath, reason: 'exists' });
        return;
      }
      
      // Overwrite mode safety: we backup the existing file before writing
      try {
        const backupDir = path.join(bookRoot, 'backups', 'init-backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `${path.basename(filePath)}-${timestamp}`);
        fs.copyFileSync(filePath, backupPath);
        warnings.push(`Backed up existing ${path.basename(filePath)} to relative path backups/init-backups/`);
      } catch (err) {
        warnings.push(`Failed to backup ${path.basename(filePath)}: ${err.message}`);
      }

      fs.writeFileSync(filePath, isJson ? JSON.stringify(content, null, 2) : content, 'utf8');
      filesUpdated.push(relativePath);
    } else {
      fs.writeFileSync(filePath, isJson ? JSON.stringify(content, null, 2) : content, 'utf8');
      filesCreated.push(relativePath);
    }
  };

  // 4. Write book.config.json
  const config = buildBookConfig({
    bookSlug,
    title: params.title,
    sourceUrl: params.sourceUrl,
    sourceProvider: params.sourceProvider,
    sourceLanguage: params.sourceLanguage,
    targetLanguage: params.targetLanguage,
    datasetVersion: params.datasetVersion
  });
  writeFileSafely(configPath, config, true);

  // 5. Write glossary.csv (with standard header only)
  const glossaryHeader = 'term,translation,category,status,notes\n';
  writeFileSafely(glossaryPath, glossaryHeader);

  // 6. Write default CSS style sheets
  let styleCssContent = `/* Default book style sheet */\n`;
  let prepDebugCssContent = `/* Default prep debug style sheet */\n`;

  // Try to copy templates from entrepreneurship css
  try {
    const entrepreneurshipRoot = getBookRoot('entrepreneurship');
    const templateStylePath = path.join(entrepreneurshipRoot, 'css', 'style.css');
    const templatePrepPath = path.join(entrepreneurshipRoot, 'css', 'prep-debug.css');

    if (fs.existsSync(templateStylePath)) {
      styleCssContent = fs.readFileSync(templateStylePath, 'utf8');
      warnings.push(`Copied template style.css from entrepreneurship.`);
    }
    if (fs.existsSync(templatePrepPath)) {
      prepDebugCssContent = fs.readFileSync(templatePrepPath, 'utf8');
      warnings.push(`Copied template prep-debug.css from entrepreneurship.`);
    }
  } catch (err) {
    warnings.push(`Could not copy CSS templates from entrepreneurship, using minimal fallbacks. Reason: ${err.message}`);
  }

  writeFileSafely(styleCssPath, styleCssContent);
  writeFileSafely(prepDebugCssPath, prepDebugCssContent);

  // 7. Write project-plan.json & project-plan.md
  generateProjectPlan(bookSlug, config, { dryRun: false });
  filesCreated.push(path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'project-plan.json')).replace(/\\/g, '/'));
  filesCreated.push(path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'project-plan.md')).replace(/\\/g, '/'));

  // 8. Generate and write workflow-state.json
  let stateRes = null;
  try {
    stateRes = writeWorkflowState(bookSlug);
    filesCreated.push(path.relative(path.join(bookRoot, '..'), path.join(bookRoot, 'workflow-state.json')).replace(/\\/g, '/'));
  } catch (err) {
    warnings.push(`Workflow state generation failed during initialization: ${err.message}`);
  }

  return {
    status: 'passed',
    bookSlug,
    title: params.title,
    dryRun: false,
    filesCreated,
    filesUpdated,
    filesSkipped,
    warnings,
    state: stateRes ? stateRes.state : null
  };
}

module.exports = {
  initBookProject
};

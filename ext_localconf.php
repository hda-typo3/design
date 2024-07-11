<?php
defined('TYPO3_MODE') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

$boot = function () {
    
    ExtensionManagementUtility::addPageTSConfig('<INCLUDE_TYPOSCRIPT: source="FILE:EXT:design/Configuration/TsConfig/TCEImagePreDefinitions.tsconfig">');
    ExtensionManagementUtility::addPageTSConfig('<INCLUDE_TYPOSCRIPT: source="FILE:EXT:design/Configuration/TsConfig/Design.tsconfig">');
    ExtensionManagementUtility::addPageTSConfig('<INCLUDE_TYPOSCRIPT: source="FILE:EXT:design/Configuration/TsConfig/Layouts.tsconfig">');
};
$boot();
unset($boot);

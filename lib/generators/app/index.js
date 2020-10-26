const fse = require('fs-extra');
const glob = require('glob');
const path = require('path');
const exec = require('execa');
const chalk = require('chalk');
const sylvanas = require('sylvanas');
const BasicGenerator = require('../../Generator');
const {getFastGithub} = require('umi-utils');

function log(...args) {
  console.log(`${chalk.gray('>')}`, ...args);
}

function globList(patternList, options) {
  return patternList
    .reduce((list, pattern) => ([...list, ...glob.sync(pattern, options)]), []);
}

const getGithubUrl = async () => {
  const fastGithub = await getFastGithub();
  if (fastGithub === 'gitee.com' || fastGithub === 'github.com.cnpmjs.org') {
    return 'https://gitee.com/bugu-pro/general-app';
  }
  return 'https://github.com/bugu-pro/general-app';
};

class BuGuManageGenerator extends BasicGenerator {

  prompting() {
    if (this.opts.args && 'tempType' in this.opts.args && 'isTypeScript' in this.opts.args) {
      this.prompts = {
        isTypeScript: this.opts.args.isTypeScript,
        tempType: this.opts.args.tempType,
      };
    } else {
      const prompts = [
        {
          name: 'tempType',
          type: 'list',
          message: 'Select the boilerplate type',
          choices: ['h5', 'web', 'management'],
          default: 'h5',
        },
        {
          name: 'language',
          type: 'list',
          message: '🤔 Which language do you want to use?',
          choices: ['TypeScript', 'JavaScript'],
          default: 'TypeScript',
        },
        {
          name: 'docker',
          type: 'confirm',
          message: '🐳 Do you need Docker?',
          default: false,
        }
      ];
      return this.prompt(prompts).then(props => {
        this.prompts = props;
      });
    }
  }

  async writing() {
    const {language = "TypeScript", tempType, docker} = this.prompts;
    
    const isTypeScript = language === 'TypeScript';

    const cwd = this.opts.env.cwd;
    const projectName = this.opts.name || cwd;
    const projectPath = path.resolve(projectName);

    const envOptions = {
      cwd: projectPath,
    };

    const githubUrl = await getGithubUrl();
    let gitArgs = [`clone`, githubUrl, `--depth=1`];

    //如果后续有其他选项可以在这里处理分支信息

    if (tempType === 'management') {
      gitArgs.push('--branch', 'management');
    }

    if (tempType === 'web') {
      gitArgs.push('--branch', 'web');
    }

    gitArgs.push(projectName);

    const yoConfigPth = path.join(projectPath, '.yo-repository');
    if (fse.existsSync(yoConfigPth)) {
      // 删除 .yo-repository
      rimraf.sync(yoConfigPth);
    }

    if (
      fse.pathExistsSync(projectPath) &&
      fse.statSync(projectPath).isDirectory() &&
      fse.readdirSync(projectPath).length > 0
    ) {
      console.log('\n');
      console.log(`👨‍👨‍👦‍👦 请在空文件夹中使用，或者使用 ${chalk.red('create-bugu myapp')}`);
      console.log(`👣 Please select an empty folder, or use ${chalk.red('create-bugu myapp')}`);
      process.exit(1);
    }

    //exec git clone
    await exec(
      `git`,
      gitArgs,
      process.env.TEST
        ? {}
        : {
          stdout: process.stdout,
          stderr: process.stderr,
          stdin: process.stdin,
        },
    );

    log(`🥳 ${chalk.green('clone success!')}`);

    // Handle js version
    if (!isTypeScript) {
      log('[Sylvanas] Prepare js environment...');
      const tsFiles = globList(['**/*.tsx', '**/*.ts'], {
        ...envOptions,
        ignore: ['**/*.d.ts'],
      });
      
      sylvanas(tsFiles, {
        ...envOptions,
        action: 'overwrite',
      });

      log('[JS] now is ready');
      const removeTsFiles = globList(['tsconfig.json', '**/*.d.ts'], envOptions);
      removeTsFiles.forEach(filePath => {
        const targetPath = path.resolve(projectPath, filePath);
        fse.removeSync(targetPath);
      });
    }

    const packageJsonPath = path.resolve(projectPath, 'package.json');
    const pkg = require(packageJsonPath);

    if(docker) {
      const _DockerFile = path.resolve(__dirname, 'Dockerfile');
      if (fse.existsSync(_DockerFile) && fse.statSync(_DockerFile).isFile()) {
        fse.copySync(_DockerFile, path.resolve(projectPath, 'Dockerfile'));
      }
    }

    // Clean up useless files
    if (pkg['create-bugu'] && pkg['create-bugu'].ignore) {
      log('Clean up...');
      const ignoreFiles = pkg['create-bugu'].ignore;
      const fileList = globList(ignoreFiles, envOptions);

      fileList.forEach(filePath => {
        const targetPath = path.resolve(projectPath, filePath);
        fse.removeSync(targetPath);
      });
    }

    log('🎉 Generate success~ Enjoy!');

  }
}

module.exports = BuGuManageGenerator;
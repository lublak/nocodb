import Noco from '../../../Noco';

import { Knex } from 'knex';
import axios from 'axios';
import Project from '../../../models/Project';
import NcConnectionMgrv2 from '../../../utils/common/NcConnectionMgrv2';
import resetMetaSakilaSqliteProject from './resetMetaSakilaSqliteProject';
import resetMysqlSakilaProject from './resetMysqlSakilaProject';
import Model from '../../../models/Model';
import resetPgSakilaProject from './resetPgSakilaProject';
import User from '../../../models/User';
import NocoCache from '../../../cache/NocoCache';
import { CacheScope } from '../../../utils/globals';
import ProjectUser from '../../../models/ProjectUser';

const loginRootUser = async () => {
  const response = await axios.post(
    'http://localhost:8080/api/v1/auth/user/signin',
    { email: 'user@nocodb.com', password: 'Password123.' }
  );

  return response.data.token;
};

const projectTitleByType = {
  sqlite: 'sampleREST',
  mysql: 'externalREST',
  pg: 'pgExtREST',
};

export class TestResetService {
  private knex: Knex | null = null;
  private readonly parallelId;
  private readonly dbType;
  private readonly isEmptyProject: boolean;

  constructor({
    parallelId,
    dbType,
    isEmptyProject,
  }: {
    parallelId: string;
    dbType: string;
    isEmptyProject: boolean;
  }) {
    this.knex = Noco.ncMeta.knex;
    this.parallelId = parallelId;
    this.dbType = dbType;
    this.isEmptyProject = isEmptyProject;
  }

  async process() {
    try {
      const token = await loginRootUser();

      const { project } = await this.resetProject({
        metaKnex: this.knex,
        token,
        dbType: this.dbType,
        parallelId: this.parallelId,
      });

      await removeAllPrefixedUsersExceptSuper(this.parallelId);

      return { token, project };
    } catch (e) {
      console.error('TestResetService:process', e);
      return { error: e };
    }
  }

  async resetProject({
    metaKnex,
    token,
    dbType,
    parallelId,
  }: {
    metaKnex: Knex;
    token: string;
    dbType: string;
    parallelId: string;
  }) {
    const title = `${projectTitleByType[dbType]}${parallelId}`;
    const project: Project | undefined = await Project.getByTitle(title);

    if (project) {
      await removeProjectUsersFromCache(project);

      const bases = await project.getBases();
      if (dbType == 'sqlite') await dropTablesOfProject(metaKnex, project);
      await Project.delete(project.id);

      if (bases.length > 0) await NcConnectionMgrv2.deleteAwait(bases[0]);
    }

    if (dbType == 'sqlite') {
      await resetMetaSakilaSqliteProject({
        token,
        metaKnex,
        title,
        oldProject: project,
        isEmptyProject: this.isEmptyProject,
      });
    } else if (dbType == 'mysql') {
      await resetMysqlSakilaProject({
        token,
        title,
        parallelId,
        oldProject: project,
        isEmptyProject: this.isEmptyProject,
      });
    } else if (dbType == 'pg') {
      await resetPgSakilaProject({
        token,
        title,
        parallelId,
        oldProject: project,
        isEmptyProject: this.isEmptyProject,
      });
    }

    return {
      project: await Project.getByTitle(title),
    };
  }
}

const dropTablesOfProject = async (knex: Knex, project: Project) => {
  const tables = await Model.list({
    project_id: project.id,
    base_id: (await project.getBases())[0].id,
  });

  for (const table of tables) {
    if (table.type == 'table') {
      await knex.raw(`DROP TABLE IF EXISTS ${table.table_name}`);
    } else {
      await knex.raw(`DROP VIEW IF EXISTS ${table.table_name}`);
    }
  }
};

const removeAllPrefixedUsersExceptSuper = async (parallelId: string) => {
  const users = (await User.list()).filter(
    (user) => !user.roles.includes('super')
  );

  for (const user of users) {
    if(user.email.startsWith(`nc_test_${parallelId}_`)) {
      await NocoCache.del(`${CacheScope.USER}:${user.email}`);
      await User.delete(user.id);
    }
  }
};

// todo: Remove this once user deletion improvement PR is merged
const removeProjectUsersFromCache = async (project: Project) => {
  const projectUsers: ProjectUser[] = await ProjectUser.getUsersList({
    project_id: project.id,
    limit: 1000,
    offset: 0,
  });

  for (const projectUser of projectUsers) {
    try {
      const user: User = await User.get(projectUser.fk_user_id);
      await NocoCache.del(
        `${CacheScope.PROJECT_USER}:${project.id}:${user.id}`
      );
    } catch (e) {
      console.error('removeProjectUsersFromCache', e);
    }
  }
};

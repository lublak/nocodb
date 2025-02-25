<script lang="ts" setup>
import type { RuleObject } from 'ant-design-vue/es/form'
import { message, navigateTo, reactive, ref, useApi, useGlobal, useI18n, useRouter } from '#imports'

const router = useRouter()

const { api, error, isLoading } = useApi({ useGlobalInstance: true })

const { t } = useI18n()

const { signOut } = useGlobal()

const formValidator = ref()

const form = reactive({
  currentPassword: '',
  password: '',
  passwordRepeat: '',
})

const formRules: Record<string, RuleObject[]> = {
  currentPassword: [
    // Current password is required
    { required: true, message: t('msg.error.signUpRules.passwdRequired') },
  ],
  password: [
    // Password is required
    { required: true, message: t('msg.error.signUpRules.passwdRequired') },
    { min: 8, message: t('msg.error.signUpRules.passwdLength') },
  ],
  passwordRepeat: [
    // PasswordRepeat is required
    { required: true, message: t('msg.error.signUpRules.passwdRequired') },
    // Passwords match
    {
      validator: (_: unknown, _v: string) => {
        return new Promise((resolve, reject) => {
          if (form.password === form.passwordRepeat) return resolve()
          reject(new Error(t('msg.error.signUpRules.passwdMismatch')))
        })
      },
      message: t('msg.error.signUpRules.passwdMismatch'),
    },
  ],
}

const passwordChange = async () => {
  const valid = formValidator.value.validate()
  if (!valid) return

  error.value = null

  await api.auth.passwordChange({
    currentPassword: form.currentPassword,
    newPassword: form.password,
  })

  message.success(t('msg.success.passwordChanged'))

  signOut()

  navigateTo('/signin')
}

const resetError = () => {
  if (error.value) error.value = null
}
</script>

<template>
  <div class="relative flex flex-col justify-center gap-2 w-full p-8 md:(bg-white rounded-lg border-1 border-gray-200 shadow)">
    <LazyGeneralNocoIcon class="color-transition hover:(ring ring-accent)" :animate="isLoading" />

    <div
      class="color-transition transform group absolute top-5 left-5 text-4xl rounded-full cursor-pointer"
      @click="() => router.back()"
    >
      <MdiChevronLeft class="text-black group-hover:(text-accent scale-110)" />
    </div>

    <h1 class="prose-2xl font-bold self-center my-4">{{ $t('activity.changePwd') }}</h1>

    <a-form
      ref="formValidator"
      data-cy="nc-user-settings-form"
      layout="vertical"
      class="change-password lg:max-w-3/4 w-full !mx-auto"
      no-style
      :model="form"
      @finish="passwordChange"
    >
      <Transition name="layout">
        <div v-if="error" class="mx-auto mb-4 bg-red-500 text-white rounded-lg w-3/4 p-1">
          <div data-cy="nc-user-settings-form__error" class="flex items-center gap-2 justify-center">
            <MaterialSymbolsWarning />
            {{ error }}
          </div>
        </div>
      </Transition>

      <a-form-item :label="$t('placeholder.password.current')" name="currentPassword" :rules="formRules.currentPassword">
        <a-input-password
          v-model:value="form.currentPassword"
          data-cy="nc-user-settings-form__current-password"
          size="large"
          class="password"
          :placeholder="$t('placeholder.password.current')"
          @focus="resetError"
        />
      </a-form-item>

      <a-form-item :label="$t('placeholder.password.new')" name="password" :rules="formRules.password">
        <a-input-password
          v-model:value="form.password"
          data-cy="nc-user-settings-form__new-password"
          size="large"
          class="password"
          :placeholder="$t('placeholder.password.new')"
          @focus="resetError"
        />
      </a-form-item>

      <a-form-item :label="$t('placeholder.password.confirm')" name="passwordRepeat" :rules="formRules.passwordRepeat">
        <a-input-password
          v-model:value="form.passwordRepeat"
          data-cy="nc-user-settings-form__new-password-repeat"
          size="large"
          class="password"
          :placeholder="$t('placeholder.password.confirm')"
          @focus="resetError"
        />
      </a-form-item>

      <div class="text-center">
        <button data-cy="nc-user-settings-form__submit" class="scaling-btn bg-opacity-100" type="submit">
          <span class="flex items-center gap-2">
            <MdiKeyChange />
            {{ $t('activity.changePwd') }}
          </span>
        </button>
      </div>
    </a-form>
  </div>
</template>

<style lang="scss">
.change-password {
  .ant-input-affix-wrapper,
  .ant-input {
    @apply !appearance-none my-1 border-1 border-solid border-primary border-opacity-50 rounded;
  }

  .password {
    input {
      @apply !border-none !m-0;
    }
  }
}
</style>

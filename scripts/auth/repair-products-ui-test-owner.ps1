$ErrorActionPreference = "Stop"
$securePassword = $null
$secureConfirmation = $null
$password = $null
$passwordPointer = [IntPtr]::Zero
$confirmationPointer = [IntPtr]::Zero

try {
    $securePassword = Read-Host -Prompt 'New synthetic TEST owner password (hidden; 12-128 characters; do not reuse a real password)' -AsSecureString
    $secureConfirmation = Read-Host -Prompt 'Confirm synthetic TEST owner password (hidden)' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $confirmationPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConfirmation)
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmationPointer)
    if ($password.Length -lt 12 -or $password.Length -gt 128 -or $password -cne $confirmation) {
        throw "Synthetic TEST passwords must match and contain 12 to 128 characters. No database change was made."
    }

    $env:NODE_ENV = "development"
    $env:UKEXIM_PRODUCTS_UI_TEST_MODE = "1"
    $env:UKEXIM_TEST_OWNER_PASSWORD = $password
    node scripts/auth/repair-products-ui-test-owner.mjs
    if ($LASTEXITCODE -ne 0) { throw "Synthetic TEST owner repair/auth verification failed. See the sanitized node result above." }
}
finally {
    Remove-Item Env:\UKEXIM_TEST_OWNER_PASSWORD -ErrorAction SilentlyContinue
    if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
    if ($confirmationPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmationPointer) }
    if ($securePassword) { $securePassword.Dispose() }
    if ($secureConfirmation) { $secureConfirmation.Dispose() }
    $password = $null
    $confirmation = $null
}

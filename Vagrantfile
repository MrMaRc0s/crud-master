env_file = File.expand_path('.env', __dir__)
raise 'Missing required .env file' unless File.file?(env_file)

settings = {}
File.foreach(env_file) do |line|
  line = line.strip
  next if line.empty? || line.start_with?('#')

  key, value = line.split('=', 2)
  settings[key] = value if key && value
end

required_settings = %w[
  VM_BOX
  GATEWAY_VM_IP
  INVENTORY_VM_IP
  BILLING_VM_IP
  GATEWAY_PORT
  INVENTORY_PORT
  INVENTORY_DB_HOST
  INVENTORY_DB_PORT
  INVENTORY_DB_NAME
  INVENTORY_DB_USER
  INVENTORY_DB_PASSWORD
  BILLING_DB_HOST
  BILLING_DB_PORT
  BILLING_DB_NAME
  BILLING_DB_USER
  BILLING_DB_PASSWORD
  RABBITMQ_PORT
  RABBITMQ_HOST
  RABBITMQ_MANAGEMENT_PORT
  RABBITMQ_MANAGEMENT_HOST_PORT
  RABBITMQ_USER
  RABBITMQ_PASSWORD
  RABBITMQ_QUEUE
]

missing_settings = required_settings.reject { |key| settings.key?(key) }
unless missing_settings.empty?
  raise "Missing required .env variables: #{missing_settings.join(', ')}"
end

Vagrant.configure('2') do |config|
  config.vm.box = settings['VM_BOX']
  config.vm.boot_timeout = 600
  config.vm.synced_folder '.', '/vagrant', disabled: true

  config.vm.define 'inventory-vm' do |inventory|
    inventory.vm.hostname = 'inventory-vm'
    inventory.vm.network 'private_network',
      ip: settings['INVENTORY_VM_IP'],
      virtualbox__intnet: 'crud-master-network'
    inventory.vm.synced_folder 'srcs/inventory-app', '/vagrant/service',
      type: 'rsync', rsync__exclude: ['node_modules', '.venv']

    inventory.vm.provider 'virtualbox' do |virtualbox|
      virtualbox.name = 'crud-master-inventory'
      virtualbox.memory = 1024
      virtualbox.cpus = 1
    end

    inventory.vm.provision 'common', type: 'shell', path: 'scripts/common.sh'
    inventory.vm.provision 'inventory', type: 'shell',
      path: 'scripts/inventory.sh',
      env: {
        'INVENTORY_PORT' => settings['INVENTORY_PORT'],
        'INVENTORY_DB_HOST' => settings['INVENTORY_DB_HOST'],
        'INVENTORY_DB_PORT' => settings['INVENTORY_DB_PORT'],
        'INVENTORY_DB_NAME' => settings['INVENTORY_DB_NAME'],
        'INVENTORY_DB_USER' => settings['INVENTORY_DB_USER'],
        'INVENTORY_DB_PASSWORD' => settings['INVENTORY_DB_PASSWORD']
      }
  end

  config.vm.define 'billing-vm' do |billing|
    billing.vm.hostname = 'billing-vm'
    billing.vm.network 'private_network',
      ip: settings['BILLING_VM_IP'],
      virtualbox__intnet: 'crud-master-network'
    billing.vm.network 'forwarded_port',
      guest: settings['RABBITMQ_MANAGEMENT_PORT'].to_i,
      host: settings['RABBITMQ_MANAGEMENT_HOST_PORT'].to_i,
      host_ip: '127.0.0.1',
      id: 'rabbitmq_management'
    billing.vm.synced_folder 'srcs/billing-app', '/vagrant/service',
      type: 'rsync', rsync__exclude: ['node_modules', '.venv']

    billing.vm.provider 'virtualbox' do |virtualbox|
      virtualbox.name = 'crud-master-billing'
      virtualbox.memory = 1536
      virtualbox.cpus = 2
    end

    billing.vm.provision 'common', type: 'shell', path: 'scripts/common.sh'
    billing.vm.provision 'billing', type: 'shell',
      path: 'scripts/billing.sh',
      env: {
        'BILLING_DB_HOST' => settings['BILLING_DB_HOST'],
        'BILLING_DB_PORT' => settings['BILLING_DB_PORT'],
        'BILLING_DB_NAME' => settings['BILLING_DB_NAME'],
        'BILLING_DB_USER' => settings['BILLING_DB_USER'],
        'BILLING_DB_PASSWORD' => settings['BILLING_DB_PASSWORD'],
        'RABBITMQ_PORT' => settings['RABBITMQ_PORT'],
        'RABBITMQ_HOST' => settings['RABBITMQ_HOST'],
        'RABBITMQ_MANAGEMENT_PORT' => settings['RABBITMQ_MANAGEMENT_PORT'],
        'RABBITMQ_USER' => settings['RABBITMQ_USER'],
        'RABBITMQ_PASSWORD' => settings['RABBITMQ_PASSWORD'],
        'RABBITMQ_QUEUE' => settings['RABBITMQ_QUEUE']
      }
  end

  config.vm.define 'gateway-vm' do |gateway|
    gateway.vm.hostname = 'gateway-vm'
    gateway.vm.network 'private_network',
      ip: settings['GATEWAY_VM_IP'],
      virtualbox__intnet: 'crud-master-network'
    gateway.vm.network 'forwarded_port',
      guest: settings['GATEWAY_PORT'].to_i,
      host: settings['GATEWAY_PORT'].to_i,
      host_ip: '127.0.0.1',
      id: 'api_gateway'
    gateway.vm.synced_folder 'srcs/api-gateway-app', '/vagrant/service',
      type: 'rsync', rsync__exclude: ['node_modules', '.venv']

    gateway.vm.provider 'virtualbox' do |virtualbox|
      virtualbox.name = 'crud-master-gateway'
      virtualbox.memory = 768
      virtualbox.cpus = 1
    end

    gateway.vm.provision 'common', type: 'shell', path: 'scripts/common.sh'
    gateway.vm.provision 'gateway', type: 'shell',
      path: 'scripts/gateway.sh',
      env: {
        'GATEWAY_PORT' => settings['GATEWAY_PORT'],
        'INVENTORY_API_URL' => "http://#{settings['INVENTORY_VM_IP']}:#{settings['INVENTORY_PORT']}",
        'RABBITMQ_HOST' => settings['BILLING_VM_IP'],
        'RABBITMQ_PORT' => settings['RABBITMQ_PORT'],
        'RABBITMQ_USER' => settings['RABBITMQ_USER'],
        'RABBITMQ_PASSWORD' => settings['RABBITMQ_PASSWORD'],
        'RABBITMQ_QUEUE' => settings['RABBITMQ_QUEUE']
      }
  end

  config.vm.post_up_message = <<~MESSAGE
    CRUD Master is running:
      Gateway:      http://127.0.0.1:#{settings['GATEWAY_PORT']}
      RabbitMQ UI:  http://127.0.0.1:#{settings['RABBITMQ_MANAGEMENT_HOST_PORT']}
  MESSAGE
end
